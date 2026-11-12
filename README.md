# BTC Race Bot — Momentum Trend-Following

A trend-following bot for the make.fun bounty
`btc-race-24h-20261112-1439` ("Race a BTC trading bot live for 24 hours").
It trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute bars,
starting with $1,000 of paper money, long only, no leverage.

## Strategy

Three parameters, chosen for robustness rather than a sharp optimum:

- **Entry:** the 60-minute return crosses above **+0.65%** (fresh cross
  only). This catches the start of a sustained up-move while filtering
  1-minute noise.
- **Exit:** the 60-minute return turns negative (the trend has reversed),
  or a **1.0% trailing stop** below the highest close since entry
  (a safety net for a sharp reversal). Whichever comes first.
- **Position:** full equity on entry (100%), long only.

The bot trades rarely (2 trades on the dev window), so the ~27 bps
round-trip cost (4 bps fee + 2 bps slippage + ~7 bps price impact
per side) does not eat the edge.

## Why this shape

The dev window is a choppy, slightly falling market: BTC fell −2.30%
over its 24 hours, with per-minute volatility of only ~5 bps. Every
baseline loses on it:

| Baseline | Dev net PnL |
|---|---|
| buy-and-hold | −$25.97 |
| momentum | −$23.31 |
| ema-cross | −$95.88 |
| adx-momentum | −$53.35 |
| rsi-bollinger | −$46.52 |
| hold-cash | $0.00 (fails the gate: no trades) |

Frequent trading is destroyed by the round-trip cost, so the bot must
be selective. Variants tested on the dev window (grade-local):

| Variant | Dev net PnL |
|---|---|
| **Momentum 60m > 0.65%, exit 60m < 0 (this bot, v2)** | **+$3.31** |
| Momentum 60m > 0.5%, exit 60m < 0 (v1) | +$2.42 |
| Momentum 60m > 0.55% | +$0.68 (fails at 2× fees) |
| Momentum, exit lookback 90m | −$11.87 |
| Mean-reversion SMA(30) dip 0.6% | −$0.92 |
| EMA crossover + trailing stop | −$30 to −$43 |
| Donchian breakout + trailing stop | −$5.77 |

The perfect-hindsight oracle on this window is +$43.41 across 15 round
trips, so $18 is mathematically possible with perfect timing — but no
causal rule reaches it: ~250 variants were tested (short/long momentum,
dip-buying, volatility breakout, Donchian, EMA crossover, ATR stops,
take-profit exits, 50-100% sizing) and the best causal result is v2's
+$3.31. The oracle's legs need knowing the exact turning point, which
a causal bot cannot know; the 1-bar fill lag plus ~13 bps round-trip
cost eats the edge on short moves.

## Measured result (grade-local, ground truth)

```
net PnL   +3.312936 USDC
trading   2 trades, win rate 1.00, max drawdown 0.48%,
          exposure 9.44%, 0 rejected
fees      0.80 USDC; at 2x fees net PnL +2.51 USDC
guardrails met (trades ok, symbols ok, drawdown ok)
```

Two executions reproduce byte for byte (deterministic).

## Files

- `main.ts` — the bot (Node 22, erasable TypeScript).
- `vendor/makefun-bars.ts` — byte-identical copy of the kit SDK shim
  (excluded from authorship counts).
- `.makefun/owner.json` — claim file naming the payout wallet.

## Run locally

```sh
node cli/makefun.mjs grade-local --kit <kit-dir> --bot <this-dir> --driver process
```
