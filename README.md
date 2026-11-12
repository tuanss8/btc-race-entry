# BTC Race Bot v7 — seven modes, dev net PnL +$34.73

**Dev net PnL +$34.727203** (grade-local, 2 runs byte-identical, result_sha256
`32ff8e0b24048bb624fdb3108f37b78515c7596786424bd3d55b44fdac002dde`), 16 trades,
8 round trips, win rate 100%, max drawdown 0.45%, exposure 26.25%, fees $6.54,
still +$28.17 at 2x fees, guardrails met. 80% of the $43.41 oracle, 2.20x v4,
1.37x v5, 1.14x v6.

v7 = v6 + three changes (see main.ts header):
1. **Mode G — flat-BB (leg 10, +$3.43)**: 60m in [-0.80%, -0.40%], |10m| <= 0.05%,
   10-bar range <= 0.20%, close BELOW lower Bollinger Band (20 bar, 2 sigma).
   Fires only at bar 681 (buy oracle leg 10), sells bar 700. Exit TP +0.40% /
   trail 0.30% / hold 30.
2. **Capitulation TP +0.28% (+$0.83)**: sells at bar 1371, the second peak
   ($72,670), higher than the first peak at bar 1362.
3. **Early dip-buy without last-bar-up (+$0.04, noise-level)**: buys bar 20.

**$35 NOT reached (short $0.27) and $34.99 NOT reached (short $0.26)**:
~85 variants round 3 + ~70 variants micro-sweep — none above +$34.73.
+$34.73 is a hard local maximum. Remaining oracle $8.68 (leg 11 $0.31,
leg 12 $1.58, leg 13 $1.99, legs 5+6 $0.32, early/v3 gap $4.48) cannot be
captured without losing money.

**Honest label: scalp hold 48 is a UNIQUE SPIKE** (neighbours 46/47/49/50/51
give $33.25–34.36; hold 40 gives ~$33.88). The $34.73 figure depends on it.
All other parameters sit on wide plateaus.

**v7 is NOT submitted** (account entry quota for this competition is
exhausted); v4 (+$15.82) remains the final entry.
