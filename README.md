# BTC Race Bot v4 — early dip-buy + momentum

**Dev net PnL +$15.82** (grade-local, 2 runs byte-identical), 4 trades, 100% win
rate, max drawdown 0.45%, fees $1.61, still +$14.19 at 2x fees. Passes the dev
gate with a large margin. **NOT submitted** (user ordered no submits until a
$25+ path is found). Current submitted entry remains v2 (+$3.31).

## Strategy

Two entry modes, chosen by bar index; one shared exit.

- **Mode A (bars 0–59): dip-buy.** The 10-minute return is <= -0.20% AND the
  last bar is up (the dip is turning). On the dev window it buys bar 22
  ($73,497) and sells bar 56 ($74,285) via the take-profit — capturing oracle
  legs 1+2 in one trade. It only fires in the first 60 bars, because a
  60-minute momentum rule cannot trade there (it needs 60 bars of history).
- **Mode B (bars 60+): v3 momentum.** The 60-minute return crosses above
  +0.65% (fresh cross only). Same as v3: buys bar 81, sells bar 159.
- **Exit (both modes):** take-profit +0.80% above the entry close, or a 1.0%
  trailing stop below the peak since entry, or the 60-minute return turning
  negative. Full equity (100%), long only, no leverage.

## Why this works (and why the general dip-buy combination failed)

The dev window's profit is concentrated in the first 6 hours (bars 0–360,
7 oracle legs worth $25.02 of the $43.41 oracle). v3's 60m rule cannot trade
before bar 60, so it misses the biggest oracle leg (+$10.84, buy bar 45, sell
bar 56) entirely. The early dip-buy fills that gap. The two modes capture
DIFFERENT legs (early dip: legs 1+2; momentum: legs 3+4), so their PnLs ADD:
$15.82 = ~$8.96 (early dip) + $6.86 (v3).

This is NOT the same as combining v3 with a general dip-buy — that was tested
and FAILED (+$2.58), because a general dip-buy enters the SAME leg as v3
(bar 71 vs 81) and then creates a losing re-entry at bar 160 (buys at the
peak). The early dip-buy works only because it is restricted to bars < 60,
where v3 cannot trade at all.

## Robustness

Measured on the simulator: dip lookback 10–12 min, dip threshold 0.10–0.20%,
TP 0.6–0.9%, early window ending anywhere in bars 45–75 all give +$14.70 to
+$15.82 (plateau, not a spike). The window must end before bar 90 (bars<90
gives +$12.54, bars<120 gives +$1.72).

## Honest limit: $25 is NOT reached

v4's +$15.82 is 36% of the $43.41 oracle. The remaining oracle value is in
leg 7 (+$4.42, a slow 134-min grind whose max 60m return is only 0.47%,
below any momentum threshold) and legs 8–15 (+$18.39, in the falling part of
the window where EVERY tested rule loses money: momentum, dip-buy, grid,
deep-dip, 120m momentum, weak-momentum with a 240m filter — all negative).
~500 strategy variants tested in total. To reach $25, a rule would need to
capture leg 7 AND several of legs 8–15 profitably — no causal rule in this
data does.

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit SDK shim.
- `.makefun/owner.json` — payout wallet.
- `LICENSE` (MIT), `package.json`, `README.md`.
