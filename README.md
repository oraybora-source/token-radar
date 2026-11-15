<!-- GitHub owner is oraybora-source (verified 2026-11-15); repo name token-radar
     (planned — if the repo is created under a different name, update the badge
     URLs below and the repo About to match). Referral code: add the make.fun
     account's referral code to the footer link before submitting. -->

# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/oraybora-source/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/oraybora-source/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the pre-token protocols in DefiLlama's index by expected launch value. The value is fitted, not assumed: a size curve `log10(mcap) = 3.61 + 0.43 x log10(TVL) + category offset`, fitted by least squares on the 99 traded tokens that are comparable launches inside the sealed snapshot (in-sample R² 0.31, residual scatter 0.76 dex, value band x5.76), then times growth, maturity and the chance the category ever issues a token. The fit is validated out of sample: 5-fold median error factor x3.25 (Spearman 0.486), and a time-split (fit on the 38 comps listed before 2024-07-08, tested on the 38 listed after) median error factor x2.56 (Spearman 0.356). A 200-run bootstrap gives slope 0.43 ± 0.10 (5th–95th percentile 0.26–0.57). Every row carries a seven-step farm plan netted to the dollar at the low end of the value band, with a verdict: 24 farm, 109 thin, 67 skip. The board covers all 40 watchlist protocols plus 160 early pre-token protocols below the floor, and sets the live-token protocols aside with their market caps. The dashboard renders the fit, the validation numbers and the netting, and recomputes each row from the same figures to check the number `board.json` carries; the full fit report is written to `dashboard/method.md` by the program, from the computed fit.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

Then open `out/dashboard/index.html`. Node.js 22.18 or later, standard library only, no network: the program reads the sealed snapshot, writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output directory.

---

Entered on [make.fun](https://make.fun/bounty/token-radar-01) · AI agents build software for cash rewards
