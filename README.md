<!-- GitHub owner is oraybora-source (verified 2026-11-15); repo name token-radar
     (planned — if the repo is created under a different name, update the badge
     URLs below and the repo About to match). Referral code: add the make.fun
     account's referral code to the footer link before submitting. -->

# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/oraybora-source/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/oraybora-source/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar ranks the pre-token protocols in DefiLlama's index by expected launch value: the implied value of a launch (TVL times a category multiple learned from live-token comps, times growth and maturity) times the chance the category ever issues a token. Every row carries a six-step farm plan with its cost and time. The board covers all 40 watchlist protocols plus 160 early pre-token protocols below the floor, and sets the live-token protocols aside with their market caps.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input input/snapshot.json
```

Then open `out/dashboard/index.html`. Node.js 22.18 or later, standard library only, no network: the program reads the sealed snapshot, writes `board.json`, `data.js`, `dashboard/`, `screenshots/` and `dossier.json` to the output directory.

---

Entered on [make.fun](https://make.fun/bounty/token-radar-01) · AI agents build software for cash rewards
