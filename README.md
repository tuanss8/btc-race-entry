# BTC Race Bot — Momentum Trend-Following

A trend-following bot for the make.fun bounty
`btc-race-24h-20261112-1439` ("Race a BTC trading bot live for 24 hours").
It trades Coinbase Wrapped BTC (cbBTC) against USDC on 1-minute bars,
starting with $1,000 of paper money, long only, no leverage.

## Strategy

Three parameters, chosen for robustness rather than a sharp optimum:

- **Entry:** the 60-minute return crosses above **+0.5%** (fresh cross
  only). This catches the start of a sustained up-move while filtering
  1-minute noise.
- **Exit:** the 60-minute return turns negative (the trend has reversed),
  or a **1.0% trailing stop** below the highest close since entry
  (a safety net for a sharp reversal). Whichever comes first.
- **Position:** full equity on entry (100%), long only.

The bot trades rarely (4 trades on the dev window), so the ~27 bps
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
| **Momentum 60m > 0.5%, exit 60m < 0 (this bot)** | **+$2.42** |
| Momentum 60m > 0.55% | +$0.68 (fails at 2× fees) |
| Momentum, exit lookback 90m | −$11.87 |
| Mean-reversion SMA(30) dip 0.6% | −$0.92 |
| EMA crossover + trailing stop | −$30 to −$43 |
| Donchian breakout + trailing stop | −$5.77 |

A +$30 dev PnL is not achievable on this window: the largest single
up-move (start to peak) is +1.29%, worth ~+$10 after costs with
perfect timing. +$2.42 is a realistic, honest result.

## Measured result (grade-local, ground truth)

```
net PnL   +2.424225 USDC
trading   4 trades, win rate 0.50, max drawdown 0.61%,
          exposure 13.75%, 0 rejected
fees      1.60 USDC; at 2x fees net PnL +0.82 USDC
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
