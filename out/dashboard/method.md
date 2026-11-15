# Token Radar: how the radar-4 model works

This file is written by main.ts from the fit it computed on the sealed snapshot, so
every number here is the number the board and the dashboard render. Nothing is
hand-typed. Snapshot 2026-11-14 from the DefiLlama protocol index; model radar-4.

## The size curve

The implied value of a launch is fitted, not assumed. The curve is a power law on the
84 traded tokens that are comparable launches: Traded protocols, excluding exchange, bridge and chain tokens and versioned or wrapped products, and whose market cap sits between 2% and 20x their TVL.
A token whose market cap is under 2% or over 20x its protocol's TVL is not a comparable
launch: a governance token capturing a fraction of a percent of the TVL it secures, or
a token worth hundreds of times it, is a data quirk or a dead token. The band is applied
before any fit, never chosen from the residuals. On all 99 comps the loose
rule keeps, the same curve gives R² 0.309, sigma 0.761 dex (band
x5.76): both numbers are shown, so the choice can be checked.

    log10(market cap) = 2.3846 + 0.6096 x log10(TVL) + category offset

The offset is the category's own premium or discount: the mean residual of its comps,
shrunk toward zero by sample size and capped at +/-0.3 dex. Fitted value is then
multiplied by a growth multiplier (1 + clamped 7-day change / 100 x 0.5),
a maturity multiplier (0.6 + min(age, 1095 days) / 1095 x 0.4),
and a launch likelihood by category, to give the expected value the board ranks by.

## How well the curve fits

- In-sample R-squared: 0.381 on 84 comps; residual scatter sigma = 0.593 dex.
- Value band: the fitted value divided and multiplied by 3.92 (10^sigma).
- Out-of-sample, 5-fold (folds by slug order, each fold tested by a curve that never saw it):
  median error factor x2.86, Spearman rank correlation 0.468.
- Out-of-sample, time-split (fit on the 33 comps listed before 2024-02-28,
  tested on the 33 listed on or after it): median error factor x2.31,
  Spearman 0.533. This is the honest analogue of finding a future launch early.
- Out-of-sample, leave-one-category-out (privacy worst): median error factor x3.58.
  A whole mechanism unseen is the blindest check here.
- Growth and maturity are judgements, not fitted weights. Fitted beside size on the comps,
  seven-day growth comes out 0.7823 and log-age -0.1755 in log10 market
  cap. Growth's fitted sign is positive, which supports the direction of
  the board's growth multiplier, but the board keeps the conservative stated weight
  0.5, not the fitted one: the fit is too noisy to trust at +100%.
  Age's fitted sign is negative, so maturity (0.6 to 1 by age) stays a
  stated judgement about a launch that has not happened, not a fitted weight.
- Bootstrap (200 seeded resamples of the comps): slope mean 0.6123,
  standard deviation 0.0888, 5th to 95th percentile 0.4646 to 0.7672.
- Top-ten stability (share of bootstrap refits in which the row stays top ten): Steakhouse Financial 100%, Gauntlet 100%, Veda 100%, USDD 100%, Upshift 100%, Nonce Capital 100%, RockawayX 82%, Hyperithm 72%, K3 Capital 56%, Bittensor dTAO 53%.

## Mechanisms

Each mechanism's offset is its categories' median fitted offset: Other +0.114 (17), Lending -0.04 (14), DEX +0.01 (14), Yield -0.031 (14), Staking -0.181 (10), RWA +0.029 (9), Perpetuals +0.152 (3), Payments -0.157 (2), Stablecoins -0.16 (1).

## Farm plans, netted to the dollar

Every plan is netted at the low end of the value band. Assumptions: A1 the launch's
airdrop pool is 10% of implied value; A2 the farmed TVL is
1% of the protocol's TVL; A3 a position earns its share;
A4 idle capital costs 5% a year. Net = low-end expected farmer value - farm
cost (gas plus opportunity cost). Verdict: FARM at net $25 or more, THIN from $0 to
$24, SKIP below $0. Verdicts on this board: 59 farm,
98 thin, 43 skip. Each plan also states its efficiency
(gross low-end dollars per $100 of capital); the most efficient FARM here earns
$140 gross per $100.

The biggest launches are often the worst farms per dollar: the top of the board is
mostly THIN and SKIP, and the FARM verdicts sit further down.
