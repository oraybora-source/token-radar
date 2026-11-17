# Token Radar: how the radar-4 model works

This file is written by main.ts from the fit it computed on the sealed snapshot, so
every number here is the number the board and the dashboard render. Nothing is
hand-typed. Snapshot 2026-11-14 from the DefiLlama protocol index; model radar-4.

## The size curve

The implied value of a launch is fitted, not assumed. The curve is a power law on the
99 traded tokens that are comparable launches: Traded protocols, excluding exchange, bridge and chain tokens and versioned or wrapped products.

    log10(market cap) = 3.6142 + 0.4323 x log10(TVL) + category offset

The offset is the category's own premium or discount: the mean residual of its comps,
shrunk toward zero by sample size and capped at +/-0.3 dex. Fitted value is then
multiplied by a growth multiplier (1 + clamped 7-day change / 100 x 0.5),
a maturity multiplier (0.6 + min(age, 1095 days) / 1095 x 0.4),
and a launch likelihood by category, to give the expected value the board ranks by.

## How well the curve fits

- In-sample R-squared: 0.309 on 99 comps; residual scatter sigma = 0.761 dex.
- Value band: the fitted value divided and multiplied by 5.76 (10^sigma).
- Out-of-sample, 5-fold (folds by slug order, each fold tested by a curve that never saw it):
  median error factor x3.25, Spearman rank correlation 0.486.
- Out-of-sample, time-split (fit on the 38 comps listed before 2024-07-08,
  tested on the 38 listed on or after it): median error factor x2.56,
  Spearman 0.356. This is the honest analogue of finding a future launch early.
- Bootstrap (200 seeded resamples of the comps): slope mean 0.4312,
  standard deviation 0.0974, 5th to 95th percentile 0.2631 to 0.5656.
- Top-ten rank stability (share of bootstrap refits in which the row stays top ten):
  rank 1 Steakhouse Financial: 100%
  rank 2 Sentora Curator: 100%
  rank 3 Gauntlet: 100%
  rank 4 Polymarket International: 88%
  rank 5 BitFi Basis: 72%
  rank 6 Veda: 72%
  rank 7 Nonce Capital: 64%
  rank 8 Hyperithm: 55%
  rank 9 OnRe: 53%
  rank 10 RockawayX: 44%

## Ablation: what each part earns

Same time-split test as above, four variants:
- Flat multiple (median mcap / TVL): x4.85, 29% within 2x (38 tested).
- Size curve, no sector offset: x3.5, 37% within 2x (38 tested).
- + sector offsets: x2.56, 34% within 2x (38 tested).
- Full model (+ growth, + maturity): x3.02, 24% within 2x (38 tested).

## Coverage

Board: 198 rows (40 watchlist, 20 off-list above the floor, 138 below it).
Set aside, of 758: 416 already record a token, 28 bridges, 29 liquid staking/restaking,
42 exchanges, 11 versioned or wrapped, 34 pre-token below the cut.

## Mechanisms

Categories are grouped by mechanism, and each mechanism's offset is its categories'
median fitted offset:
- Other: 20 comps, median offset +0.167 dex.
- Lending: 18 comps, median offset -0.173 dex.
- Yield: 17 comps, median offset -0.152 dex.
- Staking: 15 comps, median offset -0.178 dex.
- DEX: 14 comps, median offset +0.057 dex.
- RWA: 9 comps, median offset +0.132 dex.
- Perpetuals: 3 comps, median offset +0.151 dex.
- Payments: 2 comps, median offset -0.164 dex.
- Stablecoins: 1 comps, median offset -0.126 dex.

## Farm plans, netted to the dollar

Every plan is netted at the low end of the value band, under four stated assumptions:
A1 the launch's airdrop pool is 10% of implied value; A2 the farmed TVL is
1% of the protocol's TVL; A3 a position earns its share of that pool;
A4 idle capital costs 5% a year. Net = low-end expected farmer value - farm
cost (gas plus opportunity cost). Verdict: FARM at net $25 or more, THIN from $0 to
$24, SKIP below $0. Verdicts on this board: 13 farm,
115 thin, 70 skip.

The biggest launches are often the worst farms per dollar: a large protocol's pool is
split over far more farmed TVL, so a small position's share shrinks while its gas stays.
That is why the top of the board by expected value is mostly THIN and SKIP, and the
FARM verdicts sit further down, where a position is a meaningful share of the pool.
