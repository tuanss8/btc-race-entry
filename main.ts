// BTC race bot v4: early dip-buy + momentum trend-following on 1-minute cbBTC bars.
// v4 = v3 + an early dip-buy mode that fires ONLY in the first 60 bars.
//
// Strategy:
//   ENTRY MODE A (bars 0-59): dip-buy. The 10-minute return is <= -0.20%
//     AND the last bar is up (the dip is turning). This catches the early
//     rebound: on the dev window it buys bar 22 ($73,497) and sells bar 56
//     ($74,285) via the take-profit — capturing oracle legs 1+2 in one
//     trade. It only fires in the first 60 bars, because a 60-minute
//     momentum rule cannot trade there (it needs 60 bars of history), and
//     dip-buying later in the window loses money (tested: -$20 to -$104
//     in bars 360+, and the multi-mode state machine lost -$81).
//   ENTRY MODE B (bars 60+): v3 momentum. The 60-minute return crosses
//     above +0.65% (fresh cross only). Same as v3.
//   EXIT (both modes): whichever comes first —
//     (a) take-profit +0.80% above the entry close, or
//     (b) a 1.0% trailing stop below the highest close since entry, or
//     (c) the 60-minute return turns negative.
//   POSITION: full equity on entry (100%), long only, no leverage.
//   Verified by grade-local: dev net PnL +$15.82, 4 trades, 100% win rate,
//   max drawdown 0.45%, fees $1.61, deterministic (2 runs byte-identical).
//   v4 is 2.31x v3 (+$6.86) and 6.54x v1 (+$2.42) on the same window.
//
// Why this works: the dev window's profit is concentrated in the first
// 6 hours (bars 0-360, 7 oracle legs worth $25.02 of the $43.41 oracle).
// v3's 60m rule cannot trade before bar 60, so it misses the biggest
// oracle leg (+$10.84, buy bar 45, sell bar 56) entirely. The early
// dip-buy fills that gap: it buys the dip at bar 22 and rides it to the
// take-profit at bar 56. The two modes capture DIFFERENT legs (early
// dip: legs 1+2; momentum: legs 3+4), so their PnLs ADD: $15.82 =
// ~$8.96 (early dip) + $6.86 (v3). This is NOT the same as combining
// v3 with a general dip-buy — that was tested and FAILED (+$2.58),
// because a general dip-buy enters the SAME leg as v3 (bar 71 vs 81)
// and then creates a losing re-entry at bar 160. The early dip-buy
// works only because it is restricted to bars < 60, where v3 cannot
// trade at all.
//
// Robustness (measured on the simulator): the early-dip parameters sit
// on a plateau, not a spike — dip lookback 10-12 min, dip threshold
// 0.10-0.20%, TP 0.6-0.9%, early window ending anywhere in bars 45-75
// all give +$14.70 to +$15.82. The window must end before bar 90
// (bars<90 gives +$12.54, bars<120 gives +$1.72 — the dip-buy fires
// again after the peak and loses).
//
// Honest limit: $25 is NOT reached. v4's +$15.82 is 36% of the $43.41
// oracle and 2.31x v3 (+$6.86). The remaining oracle value is in leg 7
// (+$4.42, a slow 134-min grind whose max 60m return is only 0.47%,
// below any momentum threshold) and legs 8-15 (+$18.39, in the falling
// part of the window where EVERY tested rule loses money: momentum,
// dip-buy, grid, deep-dip, 120m momentum, weak-momentum with a 240m
// filter — all negative, best -$2.98). ~500 strategy variants tested
// in total. To reach $25, a rule would need to capture leg 7 AND
// several of legs 8-15 profitably — no causal rule in this data does.
// The race window is unseen; v4's shape (selective, 4 trades, sits in
// cash most of the time) is the right shape for a choppy race window,
// and it rides a big early trend if one appears.
//
// Deterministic: no randomness, no wall clock, no environment. The
// only state is the close history (kept in memory) and the position.
// Two runs on the same bars produce byte-identical orders.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Early dip-buy window: only bars with index < this use the dip-buy entry. */
const EARLY_END_BAR = 60;
/** Early dip-buy: 10-minute return must be at or below this (a dip), with the last bar up. */
const DIP_LOOKBACK = 10;
const DIP_THRESHOLD = -0.002;
/** Momentum entry: 60-minute return must cross above this (fresh cross only). */
const ENTRY_LOOKBACK = 60;
const ENTRY_THRESHOLD = 0.0065;
/** Exit: 60-minute return turns negative. */
const EXIT_LOOKBACK = 60;
/** Take-profit: sell when the close is this far above the entry close. */
const TAKE_PROFIT_PCT = 0.008;
/** Trailing stop: sell if the close falls this far below the highest close since entry. */
const TRAIL_PCT = 0.01;
/** Max slippage allowed on any order (1% past the latest close). */
const MAX_SLIPPAGE_BPS = 100;

/** Close history (price-scale integers as numbers), oldest to newest. */
const closes: number[] = [];
/** Highest close since the current position was opened (price-scale units). */
let peakSinceEntry = 0;
/** Close at which the current position was opened (price-scale units). */
let entryClose = 0;
/** Whether the momentum entry condition held on the previous bar (for fresh-cross detection). */
let entryHeldPrev = false;

function returnOver(lookback: number): number | null {
  if (closes.length <= lookback) return null;
  const now = closes[closes.length - 1]!;
  const then = closes[closes.length - 1 - lookback]!;
  if (then <= 0) return null;
  return now / then - 1;
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) closes.push(Number(bar.c));
    if (state.warmingUp) return [];

    const held = state.positions.get(SYMBOL);
    const orders: (BuyInput | SellInput)[] = [];
    const close = state.close(SYMBOL);
    if (close !== null && held !== undefined && close > BigInt(peakSinceEntry)) {
      peakSinceEntry = Number(close);
    }

    // Current bar index (0-based): closes has one entry per bar so far.
    const barIdx = closes.length - 1;

    if (held === undefined) {
      // Flat: choose the entry mode by bar index.
      let entrySignal = false;
      if (barIdx < EARLY_END_BAR) {
        // Mode A (early): dip-buy — 10m return <= -0.20% and the last bar is up.
        const dipRet = returnOver(DIP_LOOKBACK);
        const lastBarUp = closes.length >= 2 && closes[closes.length - 1]! > closes[closes.length - 2]!;
        entrySignal = dipRet !== null && dipRet <= DIP_THRESHOLD && lastBarUp;
      } else {
        // Mode B (momentum): 60m return crosses above +0.65% (fresh cross only).
        const entryRet = returnOver(ENTRY_LOOKBACK);
        const entryNow = entryRet !== null && entryRet >= ENTRY_THRESHOLD;
        entrySignal = entryNow && !entryHeldPrev;
        entryHeldPrev = entryNow;
      }
      if (entrySignal && close !== null) {
        const spend = state.cash;
        if (spend >= BigInt(state.hello.fees.min_notional_quote_units)) {
          orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS });
          peakSinceEntry = Number(close);
          entryClose = Number(close);
        }
      }
    } else {
      // Holding: exit on take-profit, trailing stop, or momentum reversal.
      const exitRet = returnOver(EXIT_LOOKBACK);
      const momentumReversed = exitRet !== null && exitRet < 0;
      let takeProfitHit = false;
      let trailHit = false;
      if (close !== null && entryClose > 0) {
        takeProfitHit = Number(close) >= entryClose * (1 + TAKE_PROFIT_PCT);
      }
      if (close !== null && peakSinceEntry > 0) {
        trailHit = Number(close) <= peakSinceEntry * (1 - TRAIL_PCT);
      }
      if (takeProfitHit || momentumReversed || trailHit) {
        orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        peakSinceEntry = 0;
        entryClose = 0;
      }
    }
    return orders;
  },
});
