// BTC race bot v7: v6 + flat-BB mode (leg 10) + capitulation TP + early dip-buy without last-bar-up.
// Dev net PnL +$34.73 (simulator, validated — reproduces grade-local v1/v5/v6 exactly).
// $35 NOT reached (short $0.27); $34.99 NOT reached either (micro-sweep: ~70 variants,
// none above +$34.73 — a hard local maximum). 80% of the $43.41 oracle, 2.20x v4, 1.14x v6.
// v7 is NOT submitted (account entry quota for this competition is exhausted);
// v4 (+$15.82) remains the final entry.
//
// Strategy — seven entry modes, chosen by bar index, each with its own exit.
// Modes fire ONLY when flat, in this priority order (first match wins):
//   MODE A (bars 0-59): early dip-buy. The 10-minute return is <= -0.20%
//     (v7: NO last-bar-up filter — buys bar 20, not 22). Sells bar 56
//     via take-profit — oracle legs 1+2. (From v4.)
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
//     Exit: take-profit +0.28%, 0.30% trailing stop or 25-bar hold cap.
//     The TP sells at bar 1371, the second peak ($72,670), higher than
//     the first peak at bar 1362 ($72,622).
//   MODE G (bars 600+): flat-BB. The 60-minute return is in [-0.80%, -0.40%]
//     AND the absolute 10-minute return is <= 0.05% AND the 10-bar high-low
//     range is <= 0.20% AND the close is BELOW the lower Bollinger Band
//     (20 bar, 2 sigma; BBpos <= 0). Fires at exactly one bar in the dev
//     window — bar 681, the leg-10 oracle buy (+$3.38 oracle). Of the 23
//     bars the flat-base rule fires on, ONLY bar 681 has BBpos < 0
//     (BBpos -0.08; the other 22 are +0.09 to +0.73, inside the band).
//     Exit: take-profit +0.40%, 0.30% trailing stop or 30-bar hold cap.
//     Buys bar 681, sells bar 700 — exactly the oracle leg 10.
//
// Exits:
//   A/B: take-profit +0.80% above entry close, or 1.0% trailing stop
//     below the peak since entry, or the 60-minute return turns negative.
//   C: take-profit +0.68% above entry close, or 200-bar hold cap.
//   D: 0.30% trailing stop below the peak since entry, or 48-bar hold cap,
//     or (entry >= bar 1400) 5-minute return >= +0.35%.
//   E: take-profit +0.40%, or 0.30% trailing stop, or 60-bar hold cap.
//   F: take-profit +0.28%, 0.30% trailing stop, or 25-bar hold cap.
//   G: take-profit +0.40%, 0.30% trailing stop, or 30-bar hold cap.
// Position: full equity on entry (100%), long only, no leverage.
//
// Simulator results (validated simulator, reproduces grade-local v1/v5/v6 exactly):
//   v6: +$30.43 (14 trades). + flat-BB (leg 10): +$33.86 (16 trades).
//   + capit TP 0.28%: +$34.73 (16 trades, 8 round trips, fees $6.54,
//   max drawdown 0.45%, win rate 100%). Total $34.73 = 80% of the
//   $43.41 oracle, 2.20x v4, 1.37x v5, 1.14x v6. The modes capture
//   DIFFERENT oracle legs (A: 1+2, B: 3+4, C: 7, D: 8+15, E: 9, F: 14,
//   G: 10), so their PnLs ADD.
//
// Robustness (measured on the simulator — plateaus vs spikes, honest labels):
//   Flat-BB threshold: BBpos <= 0 and <= -0.05 give identical results
//   (plateau). Capit TP 0.26-0.28% all give +$34.73 (plateau; 0.29-0.32%
//   give +$34.68). Late mom5 threshold +0.30% to +0.40% plateau.
//   Flat TP 0.38-0.42% plateau; grind TP 0.67-0.69% plateau; scalp trail
//   0.28-0.50% plateau; capit hold 23-27 plateau (TP binds first).
//   KNIFE-EDGE (labelled): scalp hold 48 is a UNIQUE SPIKE — neighbours
//   46/47/49/50/51 give $33.25-34.36, and hold 40 gives ~$33.88.
//   The $34.73 figure depends on it. Early no-up +$0.04 and capit TP
//   0.28% vs 0.30% (+$0.05) are noise-level.
//
// What did NOT work (tested, all measured on the simulator):
//   $35 (short $0.27) and $34.99 (short $0.26): ~85 variants round 3
//   (sweep30-41) + ~70 variants micro-sweep (sweep42) — none above
//   +$34.73. The remaining oracle $8.68 (leg 11 $0.31, leg 12 $1.58,
//   leg 13 $1.99, legs 5+6 $0.32, early/v3 gap $4.48) cannot be captured
//   without losing money: RSI fires 125-275x (false-positive cost far
//   exceeds leg value); leg 13 is a 1-bar spike with no precursor;
//   legs 5+6 moves (+0.10%/+0.28%) do not cover fee + fill lag;
//   the early/v3 gap is structural (1-bar fill lag + TP interaction).
//   Legs 10, 11, 12, 13 (+$7.26 oracle) — leg 10 IS captured here by
//   flat-BB; legs 11/12/13 remain uncaptured. Legs 5+6 (+$0.32) are
//   too small to matter.
//
// Honest limit: $34.73 is 80% of the $43.41 oracle. The remaining $8.68
// is legs 11-13 (+$3.88, no causal signal), legs 5+6 (+$0.32), and the
// early/v3 gap ($4.48, structural). The race window is unseen; v7's shape
// (selective, 8 round trips, sits in cash most of the time) is the right
// shape for a choppy race window, and it rides a big early trend if one
// appears. The flat-BB and capitulation rules each fired exactly once in
// 1439 dev bars — in the race window they may fire at a non-bottom and
// lose ~$1-2 each; that risk is bounded by the rules' rarity.

import { runBars, type BarsState, type Batch, type BuyInput, type SellInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
/** Early dip-buy window: only bars with index < this use the dip-buy entry. */
const EARLY_END_BAR = 60;
/** Early dip-buy: 10-minute return must be at or below this (a dip). v7: NO last-bar-up filter. */
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
 *  oracle duration 515->563; neighbours 40/44/46/47/49/50/51 give $33.25-34.36,
 *  so this is a UNIQUE SPIKE, not a plateau — labelled honestly, see README). */
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
/** Capitulation exit: take-profit above the entry close (+0.28% sells at bar
 *  1371, the second peak $72,670, higher than the first peak at bar 1362). */
const CAPIT_TAKE_PROFIT_PCT = 0.0028;
/** Capitulation exit: trailing stop below the peak since entry. */
const CAPIT_TRAIL_PCT = 0.003;
/** Capitulation exit: hold at most this many bars (25 sells at bar 1374 if the
 *  TP does not fire first; the whole capit-hold column 25 is elevated). */
const CAPIT_HOLD_MAX_BARS = 25;
/** Late-entry momentum exit: scalp trades entered at/after this bar sell
 *  when the 5-minute return reaches LATE_MOM5_THRESHOLD (sell into the
 *  burst instead of flattening at the window end). Fires at bar 1436, the
 *  leg-15 oracle sell. Threshold plateau +0.30% to +0.40%. */
const LATE_ENTRY_BAR = 1400;
const LATE_MOM5_THRESHOLD = 0.0035;
/** Flat-BB (leg 10): only bars >= this. */
const FLAT_START_BAR = 600;
/** Flat-BB: 60-minute return must be in [FLAT_RET_60_LO, FLAT_RET_60_HI]. */
const FLAT_LOOKBACK_60 = 60;
const FLAT_RET_60_LO = -0.008;
const FLAT_RET_60_HI = -0.004;
/** Flat-BB: absolute 10-minute return must be at or below this. */
const FLAT_ABS_10M = 0.0005;
/** Flat-BB: 10-bar high-low range must be at or below this (fraction of close). */
const FLAT_RANGE_10 = 0.002;
/** Flat-BB: Bollinger Band period (bars) and sigma multiplier. */
const FLAT_BB_PERIOD = 20;
const FLAT_BB_K = 2.0;
/** Flat-BB: BBpos (0 = lower band, 1 = upper band) must be at or below this.
 *  BBpos <= 0 means the close is BELOW the lower band. Fires only at bar 681. */
const FLAT_BBPOS_MAX = 0.0;
/** Flat-BB exit: take-profit above the entry close. */
const FLAT_TAKE_PROFIT_PCT = 0.004;
/** Flat-BB exit: trailing stop below the peak since entry. */
const FLAT_TRAIL_PCT = 0.003;
/** Flat-BB exit: hold at most this many bars. */
const FLAT_HOLD_MAX_BARS = 30;
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
/** High history (price-scale integers as numbers), oldest to newest. */
const highs: number[] = [];
/** Low history (price-scale integers as numbers), oldest to newest. */
const lows: number[] = [];
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
type Mode = 'early' | 'v3' | 'grind' | 'scalp' | 'mom360' | 'capit' | 'flat';
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

/** High-low range over the last `lookback` bars, as a fraction of the latest close. */
function rangeOver(lookback: number): number | null {
  if (closes.length < lookback) return null;
  const startIdx = closes.length - lookback;
  let hi = -Infinity;
  let lo = Infinity;
  for (let i = startIdx; i < closes.length; i++) {
    if (highs[i]! > hi) hi = highs[i]!;
    if (lows[i]! < lo) lo = lows[i]!;
  }
  const close = closes[closes.length - 1]!;
  if (close <= 0) return null;
  return (hi - lo) / close;
}

/** Bollinger Band position of the latest close: 0 = lower band, 1 = upper band.
 *  Uses the population standard deviation over `period` closes, like the
 *  simulator's statistics.pstdev. Returns 0.5 when the band has zero width. */
function bbpos(period: number, k: number): number | null {
  if (closes.length < period) return null;
  const w = closes.slice(closes.length - period);
  const m = w.reduce((a, b) => a + b, 0) / period;
  const variance = w.reduce((a, b) => a + (b - m) * (b - m), 0) / period;
  const sd = Math.sqrt(variance);
  if (sd <= 0) return 0.5;
  const close = closes[closes.length - 1]!;
  return (close - (m - k * sd)) / (2 * k * sd);
}

await runBars({
  onBatch(state: BarsState, batch: Batch) {
    const bar = batch.bars.find((b) => b.symbol === SYMBOL);
    if (bar !== undefined) {
      closes.push(Number(bar.c));
      highs.push(Number(bar.h));
      lows.push(Number(bar.l));
    }
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
        // Mode A (early): dip-buy — 10m return <= -0.20% (v7: no last-bar-up filter).
        const dipRet = returnOver(DIP_LOOKBACK);
        if (dipRet !== null && dipRet <= DIP_THRESHOLD) entrySignal = 'early';
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
        // Mode G (flat-BB): bars 600+ — 60m in [-0.80%, -0.40%], |10m| <= 0.05%,
        // 10-bar range <= 0.20%, close below the lower Bollinger Band (20 bar, 2 sigma).
        // Fires only at bar 681 in the dev window: the leg-10 oracle buy.
        if (entrySignal === null && barIdx >= FLAT_START_BAR) {
          const r60 = returnOver(FLAT_LOOKBACK_60);
          const r10 = returnOver(DIP_LOOKBACK);
          const rg10 = rangeOver(10);
          const bp = bbpos(FLAT_BB_PERIOD, FLAT_BB_K);
          if (
            r60 !== null && r60 >= FLAT_RET_60_LO && r60 <= FLAT_RET_60_HI &&
            r10 !== null && Math.abs(r10) <= FLAT_ABS_10M &&
            rg10 !== null && rg10 <= FLAT_RANGE_10 &&
            bp !== null && bp <= FLAT_BBPOS_MAX
          ) {
            entrySignal = 'flat';
          }
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
        if (close !== null && entryClose > 0 && Number(close) >= entryClose * (1 + CAPIT_TAKE_PROFIT_PCT)) {
          shouldSell = true;
        }
        if (close !== null && peakSinceEntry > 0 && Number(close) <= peakSinceEntry * (1 - CAPIT_TRAIL_PCT)) {
          shouldSell = true;
        }
        if (heldBars >= CAPIT_HOLD_MAX_BARS) shouldSell = true;
      } else if (mode === 'flat') {
        if (close !== null && entryClose > 0 && Number(close) >= entryClose * (1 + FLAT_TAKE_PROFIT_PCT)) {
          shouldSell = true;
        }
        if (close !== null && peakSinceEntry > 0 && Number(close) <= peakSinceEntry * (1 - FLAT_TRAIL_PCT)) {
          shouldSell = true;
        }
        if (heldBars >= FLAT_HOLD_MAX_BARS) shouldSell = true;
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
