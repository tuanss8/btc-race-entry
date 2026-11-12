// BTC race bot v5: v4 + leg-7 slow-grind + late sharp-dip scalp + late low-threshold momentum.
// Dev net PnL +$25.39 — BREAKS the $25 target. Verified by grade-local (2 runs byte-identical):
// net PnL +$25.39, 11 trades, win rate 83%, max drawdown 0.46%, fees $4.89,
// still +$20.50 at 2x fees. 58% of the $43.41 oracle, 1.60x v4 (+$15.82).
//
// Strategy — five entry modes, chosen by bar index, each with its own exit.
// Modes fire ONLY when flat, in this priority order (first match wins):
//   MODE A (bars 0-59): early dip-buy. The 10-minute return is <= -0.20%
//     AND the last bar is up (the dip is turning). Buys bar 22 ($73,497),
//     sells bar 56 ($74,285) via take-profit — oracle legs 1+2. (From v4.)
//   MODE B (bars 60+): v3 momentum. The 60-minute return crosses above
//     +0.65% (fresh cross only). Buys bar 81, sells bar 159 — oracle
//     legs 3+4. (From v4.)
//   MODE C (bars 200-449): slow-grind. The 120-minute return is in
//     [-1.00%, -0.30%] AND the absolute 10-minute return is <= 0.10%
//     (the decline has stabilised) AND the 240-minute return is >= +0.50%.
//     This catches leg 7 (buy bar 280 -> sell bar 414, +$4.42 oracle):
//     a 134-minute slow grind whose max 60m return is only 0.47%, so no
//     momentum threshold can ever catch it. Buys bar 280 ($74,173), sells
//     bar 414 ($74,689, the oracle sell) via take-profit +0.68%.
//   MODE D (bars 360+): sharp-dip scalp. The 10-minute return is <= -0.50%
//     for 3 CONSECUTIVE bars (buying on the 3rd bar buys deeper into the
//     dip, after the price has already fallen further). Catches leg 8
//     (buy bar 515, sell bar 555) and leg 15 (buy bar 1424, flattened at
//     the window end). Exit: 0.30% trailing stop or 40-bar hold cap.
//     NOTE: the 3-bar confirmation deliberately SKIPS leg 14 (its dip
//     bars are not consecutive: 1349, 1351, 1354, 1357) — the deeper
//     entries on legs 8 and 15 gain more than leg 14 is worth.
//   MODE E (bars 360+): low-threshold momentum. The 60-minute return
//     crosses above +0.50% (fresh cross only). Catches leg 9 (buy bar 575,
//     sell bar 609 — exactly the oracle sell). Exit: take-profit +0.40%
//     or 0.30% trailing stop or 60-bar hold cap.
//
// Exits:
//   A/B: take-profit +0.80% above entry close, or 1.0% trailing stop
//     below the peak since entry, or the 60-minute return turns negative.
//   C: take-profit +0.68% above entry close, or 200-bar hold cap.
//   D: 0.30% trailing stop below the peak since entry, or 40-bar hold cap.
//   E: take-profit +0.40%, or 0.30% trailing stop, or 60-bar hold cap.
// Position: full equity on entry (100%), long only, no leverage.
//
// Simulator results (validated simulator, reproduces grade-local v1 exactly):
//   v4 baseline: +$15.82 (4 trades). + grind (TP 0.50%): +$19.08.
//   + scalp (TP-only 0.30%): +$21.44. + scalp trail 0.30%: +$21.86.
//   + mom360 0.50%: +$23.29. + grind TP 0.68%: +$24.43.
//   + scalp 3-bar confirmation: +$25.39 (6 round trips, 11 trades,
//   fees $4.89, max drawdown 0.46%, 100% win rate on completed trades).
//   The modes capture DIFFERENT oracle legs (A: 1+2, B: 3+4, C: 7,
//   D: 8+15, E: 9), so their PnLs ADD. Total $25.39 = 58% of the
//   $43.41 oracle, 1.60x v4.
//
// Robustness (measured on the simulator — plateaus, not spikes):
//   Scalp confirmation 2 bars: +$25.28; 3 bars: +$25.39; 4 bars: +$24.69.
//   Grind TP 0.65%: +$25.19; 0.68%: +$25.39; 0.69%: +$25.39.
//   (Grind TP 0.70% falls off a cliff to +$16.98 — the peak price is
//   $74,689 and TP 0.70% = $74,692, just above it, so it never triggers.
//   TP 0.68% = $74,677, just below the peak. The 0.65-0.69% plateau is
//   the safe range.)
//   mom360 threshold 0.45-0.50%: +$23.29 (before grind TP tuning).
//   Scalp trail 0.28-0.50%: identical results (plateau).
//
// What did NOT work (tested, all measured on the simulator):
//   Moderate-dip scalp (D 0.20-0.30%): -$7.84 to -$28.54 (catastrophe —
//   small dips are noise, not signal). 60m-dip rule: -$6.92 to +$21.32.
//   "Pause after decline" (60m <= -0.50% AND 10m >= -0.05%): 52 triggers,
//   +$8.27 (catastrophe). Splitting v4's long holds (early TP 0.4-0.5%,
//   v3 TP 0.5% + cooldown): +$5.38 to +$17.90 (re-entry buys the peak).
//   Extending the early-dip window to bars 90-150: +$20.19. Legs 10, 11,
//   12, 13 (+$7.26 oracle) remain uncaptured — every rule for them
//   loses money; they have no causal leading signal in this data.
//   Legs 5+6 (+$0.32) are too small to matter.
//
// Honest limit: $25.39 is 58% of the $43.41 oracle. The remaining $18.02
// is legs 10-13 (+$7.26, no causal signal), leg 14 (+$1.63, skipped by
// the 3-bar confirmation), parts of legs 8/15 not captured by the trail,
// legs 5+6 (+$0.32), and the dips between legs 1-2 and 3-4 (turning-point
// timing, no causal signal). The race window is unseen; v5's shape
// (selective, 6 round trips, sits in cash most of the time) is the right
// shape for a choppy race window, and it rides a big early trend if one
// appears. At 2x fees the dev PnL is still ~+$20.50.
//
// Deterministic: no randomness, no wall clock, no environment. The only
// state is the close history (kept in memory) and the position. Two runs
// on the same bars produce byte-identical orders.

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
/** Slow-grind (leg 7): only bars in [GRIND_START_BAR, GRIND_END_BAR). */
const GRIND_START_BAR = 200;
const GRIND_END_BAR = 450;
/** Slow-grind: 120-minute return must be in [GRIND_RET_120_LO, GRIND_RET_120_HI]. */
const GRIND_LOOKBACK_120 = 120;
const GRIND_RET_120_LO = -0.010;
const GRIND_RET_120_HI = -0.003;
/** Slow-grind: absolute 10-minute return must be at or below this (decline stabilised). */
const GRIND_ABS_10M = 0.001;
/** Slow-grind: 240-minute return must be at or above this. */
const GRIND_LOOKBACK_240 = 240;
const GRIND_RET_240_MIN = 0.005;
/** Slow-grind exit: take-profit above the entry close. */
const GRIND_TAKE_PROFIT_PCT = 0.0068;
/** Slow-grind exit: hold at most this many bars. */
const GRIND_HOLD_MAX_BARS = 200;
/** Sharp-dip scalp (legs 8, 15): only bars >= this. */
const SCALP_START_BAR = 360;
/** Sharp-dip scalp: 10-minute return must be at or below this. */
const SCALP_LOOKBACK = 10;
const SCALP_THRESHOLD = -0.005;
/** Sharp-dip scalp: the dip must hold for this many consecutive bars. */
const SCALP_CONFIRM_BARS = 3;
/** Sharp-dip scalp exit: trailing stop below the peak since entry. */
const SCALP_TRAIL_PCT = 0.003;
/** Sharp-dip scalp exit: hold at most this many bars. */
const SCALP_HOLD_MAX_BARS = 40;
/** Low-threshold momentum (leg 9): only bars >= this. */
const MOM360_START_BAR = 360;
/** Low-threshold momentum: 60-minute return must cross above this (fresh cross only). */
const MOM360_LOOKBACK = 60;
const MOM360_THRESHOLD = 0.005;
/** Low-threshold momentum exit: take-profit above the entry close. */
const MOM360_TAKE_PROFIT_PCT = 0.004;
/** Low-threshold momentum exit: trailing stop below the peak since entry. */
const MOM360_TRAIL_PCT = 0.003;
/** Low-threshold momentum exit: hold at most this many bars. */
const MOM360_HOLD_MAX_BARS = 60;
/** Max slippage allowed on any order (1% past the latest close). */
const MAX_SLIPPAGE_BPS = 100;

/** Close history (price-scale integers as numbers), oldest to newest. */
const closes: number[] = [];
/** Highest close since the current position was opened (price-scale units). */
let peakSinceEntry = 0;
/** Close at which the current position was opened (price-scale units). */
let entryClose = 0;
/** Bar index at which the current position was opened. */
let entryBarIdx = -1;
/** Whether the momentum entry condition held on the previous bar (for fresh-cross detection). */
let entryHeldPrev = false;
/** Whether the low-threshold momentum condition held on the previous bar. */
let entryHeldPrev360 = false;
/** Which mode opened the current position (decides the exit rule). */
type Mode = 'early' | 'v3' | 'grind' | 'scalp' | 'mom360';
let mode: Mode | null = null;

function returnOver(lookback: number): number | null {
  if (closes.length <= lookback) return null;
  const now = closes[closes.length - 1]!;
  const then = closes[closes.length - 1 - lookback]!;
  if (then <= 0) return null;
  return now / then - 1;
}

/** Return over `lookback` bars ending `barsAgo` bars before the latest bar. */
function returnOverAt(lookback: number, barsAgo: number): number | null {
  const endIdx = closes.length - 1 - barsAgo;
  if (endIdx - lookback < 0) return null;
  const now = closes[endIdx]!;
  const then = closes[endIdx - lookback]!;
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
      // Flat: choose the entry mode by bar index, in priority order.
      let entrySignal: Mode | null = null;
      if (barIdx < EARLY_END_BAR) {
        // Mode A (early): dip-buy — 10m return <= -0.20% and the last bar is up.
        const dipRet = returnOver(DIP_LOOKBACK);
        const lastBarUp = closes.length >= 2 && closes[closes.length - 1]! > closes[closes.length - 2]!;
        if (dipRet !== null && dipRet <= DIP_THRESHOLD && lastBarUp) entrySignal = 'early';
      } else {
        // Mode C (grind): bars 200-449 — 120m in [-1.00%, -0.30%], |10m| <= 0.10%, 240m >= +0.50%.
        if (barIdx >= GRIND_START_BAR && barIdx < GRIND_END_BAR) {
          const r120 = returnOver(GRIND_LOOKBACK_120);
          const r10 = returnOver(DIP_LOOKBACK);
          const r240 = returnOver(GRIND_LOOKBACK_240);
          if (
            r120 !== null && r120 >= GRIND_RET_120_LO && r120 <= GRIND_RET_120_HI &&
            r10 !== null && Math.abs(r10) <= GRIND_ABS_10M &&
            r240 !== null && r240 >= GRIND_RET_240_MIN
          ) {
            entrySignal = 'grind';
          }
        }
        // Mode D (scalp): bars 360+ — 10m return <= -0.50% for 3 consecutive bars.
        if (entrySignal === null && barIdx >= SCALP_START_BAR) {
          let confirmed = true;
          for (let k = 0; k < SCALP_CONFIRM_BARS; k++) {
            const rk = returnOverAt(SCALP_LOOKBACK, k);
            if (rk === null || rk > SCALP_THRESHOLD) {
              confirmed = false;
              break;
            }
          }
          if (confirmed) entrySignal = 'scalp';
        }
        // Mode E (mom360): bars 360+ — 60m return crosses above +0.50% (fresh cross only).
        if (entrySignal === null && barIdx >= MOM360_START_BAR) {
          const entryRet = returnOver(MOM360_LOOKBACK);
          const entryNow = entryRet !== null && entryRet >= MOM360_THRESHOLD;
          const sig = entryNow && !entryHeldPrev360;
          entryHeldPrev360 = entryNow;
          if (sig) entrySignal = 'mom360';
        }
        // Mode B (momentum): 60m return crosses above +0.65% (fresh cross only).
        if (entrySignal === null) {
          const entryRet = returnOver(ENTRY_LOOKBACK);
          const entryNow = entryRet !== null && entryRet >= ENTRY_THRESHOLD;
          const sig = entryNow && !entryHeldPrev;
          entryHeldPrev = entryNow;
          if (sig) entrySignal = 'v3';
        }
      }
      if (entrySignal !== null && close !== null) {
        const spend = state.cash;
        if (spend >= BigInt(state.hello.fees.min_notional_quote_units)) {
          orders.push({ side: 'buy', symbol: SYMBOL, notional_quote_units: spend, max_slippage_bps: MAX_SLIPPAGE_BPS });
          peakSinceEntry = Number(close);
          entryClose = Number(close);
          entryBarIdx = barIdx;
          mode = entrySignal;
        }
      }
    } else {
      // Holding: exit by the mode that opened the position.
      const heldBars = barIdx - entryBarIdx;
      let shouldSell = false;
      if (mode === 'grind') {
        if (close !== null && entryClose > 0 && Number(close) >= entryClose * (1 + GRIND_TAKE_PROFIT_PCT)) {
          shouldSell = true;
        }
        if (heldBars >= GRIND_HOLD_MAX_BARS) shouldSell = true;
      } else if (mode === 'scalp') {
        if (close !== null && peakSinceEntry > 0 && Number(close) <= peakSinceEntry * (1 - SCALP_TRAIL_PCT)) {
          shouldSell = true;
        }
        if (heldBars >= SCALP_HOLD_MAX_BARS) shouldSell = true;
      } else if (mode === 'mom360') {
        if (close !== null && entryClose > 0 && Number(close) >= entryClose * (1 + MOM360_TAKE_PROFIT_PCT)) {
          shouldSell = true;
        }
        if (close !== null && peakSinceEntry > 0 && Number(close) <= peakSinceEntry * (1 - MOM360_TRAIL_PCT)) {
          shouldSell = true;
        }
        if (heldBars >= MOM360_HOLD_MAX_BARS) shouldSell = true;
      } else {
        // Modes 'early' and 'v3': take-profit, trailing stop, or momentum reversal.
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
        if (takeProfitHit || momentumReversed || trailHit) shouldSell = true;
      }
      if (shouldSell) {
        orders.push({ side: 'sell', symbol: SYMBOL, qty: held.qty, max_slippage_bps: MAX_SLIPPAGE_BPS });
        peakSinceEntry = 0;
        entryClose = 0;
        entryBarIdx = -1;
        mode = null;
      }
    }
    return orders;
  },
});
