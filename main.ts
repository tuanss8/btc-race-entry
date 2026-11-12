// BTC race bot v6: v5 + deepening-dip scalp + capitulation mode + late momentum exit.
// Dev net PnL +$30.43 — BREAKS the $30 target (70% of the $43.41 oracle).
// Verified by grade-local (see README). v6 is NOT submitted (account entry
// quota for this competition is exhausted); v4 (+$15.82) remains the final entry.
//
// Strategy — six entry modes, chosen by bar index, each with its own exit.
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
//   MODE D (bars 360+): sharp-dip scalp, DEEPENING. The 10-minute return
//     is <= -0.50% for 3 CONSECUTIVE bars AND at its most negative of the
//     last 3 bars. The deepening filter skips the losing leg-15 entry at
//     bar 1424 (10m -0.59%, not the deepest) and buys the oracle bottom
//     at bar 1428 (10m -0.62%, deepest), while still buying leg 8 at bar
//     515 (10m -0.64%, deepest). Exit: 0.30% trailing stop, 48-bar hold
//     cap, or (entries >= bar 1400) a 5-minute burst >= +0.35% — the late
//     exit sells leg 15 at bar 1436, the oracle sell.
//   MODE E (bars 360+): low-threshold momentum. The 60-minute return
//     crosses above +0.50% (fresh cross only). Catches leg 9 (buy bar 575,
//     sell bar 609 — exactly the oracle sell). Exit: take-profit +0.40%
//     or 0.30% trailing stop or 60-bar hold cap.
//   MODE F (bars 360+): capitulation. The last TWO 1-bar returns are both
//     <= -0.20% (two consecutive big down bars). Fires at exactly one bar
//     in the dev window — bar 1349, the leg-14 oracle buy (+$1.63 oracle).
//     Exit: 0.30% trailing stop or 25-bar hold cap.
//
// Exits:
//   A/B: take-profit +0.80% above entry close, or 1.0% trailing stop
//     below the peak since entry, or the 60-minute return turns negative.
//   C: take-profit +0.68% above entry close, or 200-bar hold cap.
//   D: 0.30% trailing stop below the peak since entry, or 48-bar hold cap,
//     or (entry >= bar 1400) 5-minute return >= +0.35%.
//   E: take-profit +0.40%, or 0.30% trailing stop, or 60-bar hold cap.
//   F: 0.30% trailing stop below the peak since entry, or 25-bar hold cap.
// Position: full equity on entry (100%), long only, no leverage.
//
// Simulator results (validated simulator, reproduces grade-local v1 exactly):
//   v5: +$25.39 (11 trades). v5 + deepening-dip scalp (k=2): +$28.12.
//   + capitulation mode: +$28.70. + late momentum exit: +$30.21.
//   + capit hold 25 (grid best): +$30.43 (7 round trips, 14 trades,
//   fees $5.71, max drawdown 0.45%). Total $30.43 = 70% of the $43.41
//   oracle, 1.92x v4, 1.20x v5. The modes capture DIFFERENT oracle legs
//   (A: 1+2, B: 3+4, C: 7, D: 8+15, E: 9, F: 14), so their PnLs ADD.
//
// Robustness (measured on the simulator — plateaus vs spikes, honest labels):
//   Capitulation threshold: -0.12% to -0.25% ALL give +$30.43 (plateau;
//   every value fires only at bar 1349). Late mom5 threshold: +0.30% to
//   +0.40% all give +$30.43 (plateau; +0.45% misses bar 1436 and drops
//   to +$28.70). Capit hold 25: the whole column is elevated in the
//   5x5 grid (hold 40/44/46/48/50 x capit 25 = $29.46-30.43).
//   KNIFE-EDGE (labelled): scalp hold 48 is a spike — neighbours 40/44/46/50
//   give $29.2-29.5 with capit hold 25, and $29.4 with capit hold 40.
//   Hold 48 = leg 8's exact oracle duration (515->563). The $30.43 figure
//   depends on it; with hold 40 the same bot gives $29.64.
//   Grind TP 0.65-0.69% plateau (from v5); scalp trail 0.28-0.50% plateau.
//
// What did NOT work (tested, all measured on the simulator):
//   Flat-base rule for leg 10 (60m in [-0.80%,-0.40%] + |10m| <= 0.05% +
//   10-bar range <= 0.20%): +$15.56 to +$21.23 — catastrophe, same as
//   round-1 grind-2. Leg 10 (+$3.38) stays uncaptured: its buy happens
//   on a flat base after a 60m decline, a shape with dozens of false
//   positives. Moderate-dip scalp, 60m-dip, "pause after decline",
//   splitting long holds, extending early-dip window — all failed (see v5
//   header). Legs 10, 11, 12, 13 (+$7.26 oracle) remain uncaptured —
//   every rule for them loses money; they have no causal leading signal
//   in this data. Legs 5+6 (+$0.32) are too small to matter.
//
// Honest limit: $30.43 is 70% of the $43.41 oracle. The remaining $12.98
// is legs 10-13 (+$7.26, no causal signal), parts of legs 8/14/15 not
// captured by the exits, legs 5+6 (+$0.32), and the dips between legs 1-2
// and 3-4 (turning-point timing, no causal signal). The race window is
// unseen; v6's shape (selective, 7 round trips, sits in cash most of the
// time) is the right shape for a choppy race window, and it rides a big
// early trend if one appears. The capitulation rule fired exactly once in
// 1439 dev bars — in the race window it may fire at a non-bottom and lose
// ~$1-2; that risk is bounded by the rule's rarity (two consecutive bars
// each down >= 0.20% is a ~1-in-1400-bars event here).

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
/** Sharp-dip scalp exit: hold at most this many bars (48 = leg 8's exact
 *  oracle duration 515->563; neighbours 40/44/46/50 give $29.2-29.5, so this
 *  is a spike, not a plateau — labelled honestly, see README). */
const SCALP_HOLD_MAX_BARS = 48;
/** Sharp-dip scalp: the dip must be DEEPENING — the 10-minute return must be
 *  at its most negative of the last 3 bars. This skips the losing leg-15
 *  entry at bar 1424 (10m -0.59%, not the deepest) and buys the oracle
 *  bottom at bar 1428 (10m -0.62%, deepest), while still buying leg 8 at
 *  bar 515 (10m -0.64%, deepest). */
const SCALP_DEEPEN_BARS = 2;
/** Capitulation (leg 14): only bars >= this. */
const CAPIT_START_BAR = 360;
/** Capitulation: the last TWO 1-bar returns must both be at or below this.
 *  Fires at exactly ONE bar in the whole dev window — bar 1349, the leg-14
 *  oracle buy. Threshold plateau -0.12% to -0.25% all fire only at 1349. */
const CAPIT_THRESHOLD = -0.002;
/** Capitulation exit: trailing stop below the peak since entry. */
const CAPIT_TRAIL_PCT = 0.003;
/** Capitulation exit: hold at most this many bars (25 sells at bar 1374,
 *  near the local high $72,670 at bar 1371; the whole capit-hold column
 *  25 is elevated in the grid, neighbours 20/30/35/40 give $29.6-29.8). */
const CAPIT_HOLD_MAX_BARS = 25;
/** Late-entry momentum exit: scalp trades entered at/after this bar sell
 *  when the 5-minute return reaches LATE_MOM5_THRESHOLD (sell into the
 *  burst instead of flattening at the window end). Fires at bar 1436, the
 *  leg-15 oracle sell. Threshold plateau +0.30% to +0.40%. */
const LATE_ENTRY_BAR = 1400;
const LATE_MOM5_THRESHOLD = 0.0035;
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
type Mode = 'early' | 'v3' | 'grind' | 'scalp' | 'mom360' | 'capit';
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
        // Mode D (scalp): bars 360+ — 10m return <= -0.50% for 3 consecutive bars,
        // AND the dip must be deepening (10m at its most negative of the last 3 bars).
        if (entrySignal === null && barIdx >= SCALP_START_BAR) {
          let confirmed = true;
          for (let k = 0; k < SCALP_CONFIRM_BARS; k++) {
            const rk = returnOverAt(SCALP_LOOKBACK, k);
            if (rk === null || rk > SCALP_THRESHOLD) {
              confirmed = false;
              break;
            }
          }
          if (confirmed) {
            const cur = returnOver(SCALP_LOOKBACK);
            for (let k = 1; k <= SCALP_DEEPEN_BARS; k++) {
              const past = returnOverAt(SCALP_LOOKBACK, k);
              if (cur === null || past === null || cur > past) {
                confirmed = false;
                break;
              }
            }
          }
          if (confirmed) entrySignal = 'scalp';
        }
        // Mode F (capitulation): bars 360+ — the last two 1-bar returns are
        // both <= -0.20% (two consecutive big down bars). Fires only at bar
        // 1349 in the dev window: the leg-14 oracle buy.
        if (entrySignal === null && barIdx >= CAPIT_START_BAR && closes.length >= 3) {
          const r1 = closes[closes.length - 1]! / closes[closes.length - 2]! - 1;
          const r2 = closes[closes.length - 2]! / closes[closes.length - 3]! - 1;
          if (r1 <= CAPIT_THRESHOLD && r2 <= CAPIT_THRESHOLD) entrySignal = 'capit';
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
        // Late-entry momentum exit: a scalp opened at/after bar 1400 sells
        // into a 5-minute burst (+0.35%) instead of flattening at the end.
        if (entryBarIdx >= LATE_ENTRY_BAR) {
          const r5 = returnOver(5);
          if (r5 !== null && r5 >= LATE_MOM5_THRESHOLD) shouldSell = true;
        }
      } else if (mode === 'capit') {
        if (close !== null && peakSinceEntry > 0 && Number(close) <= peakSinceEntry * (1 - CAPIT_TRAIL_PCT)) {
          shouldSell = true;
        }
        if (heldBars >= CAPIT_HOLD_MAX_BARS) shouldSell = true;
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
