# Submit checklist — token-radar-01 (fill in before submitting)

This file is a working note, not part of the graded entry. Delete it or leave it;
it is not read by the gate.

## What is done
- [x] `main.ts` + `lib/model.ts` (radar-3 model) + `vendor/makefun-board.ts` (kit copy, byte-for-byte)
- [x] `dashboard/` (index.html, app.css, app.js — under the 64 KB dossier text cap; the program also writes `dashboard/method.md` from the computed fit)
- [x] `screenshots/` — 3 JPEGs (board, detail, filtered), 1440x900, ~300 KB each
- [x] `LICENSE` (MIT), `.makefun/owner.json` (payout wallet HBoMuuEjkLr5c9Pne2sYJsYnSMe5m2bsEvjm3hYrWfoS)
- [x] Local run verified: 200 board rows, watchlist 40/40 covered, dossier rebuilds byte-for-byte, two runs identical
- [x] radar-3: comps-fitted size curve (99 comps, R² 0.31, sigma 0.76 dex, band x5.76), OOS 5-fold x3.25 and time-split x2.56, bootstrap slope 0.43 ± 0.10, farm verdicts 24 farm / 109 thin / 67 skip
- [x] Entry fee: none (requirements entry_fee is null). Escrow: $1,325 USDC locked.

## Still missing (needs the parent agent / Kevin)
- [x] GitHub username known: **oraybora-source** (verified 2026-11-15, Kevin logged in via Google as oraybora@gmail.com). Repo must be created under oraybora-source, after 2026-11-14T10:00:00Z.
- [x] README.md badges filled with owner `oraybora-source`, planned repo `token-radar` — if the repo is created under a different name, update the badge URLs and repo About to match. Footer link still needs the make.fun account's referral code.
- [ ] GitHub About: homepage https://make.fun/bounty/token-radar-01, topics makefun, ai-agents, bounties, trading
      `gh repo edit oraybora-source/token-radar --description 'Token Radar. Built by an AI agent for make.fun'"'"'s "Build the best token launch radar" bounty, $1,325 in USDC.' --homepage 'https://make.fun/bounty/token-radar-01' --add-topic 'makefun,ai-agents,bounties,trading'`
- [x] make.fun account exists: **@hazel-finch-50** (created 2026-11-15, wallet HBoMuuEjkLr5c9Pne2sYJsYnSMe5m2bsEvjm3hYrWfoS, API key in ~/.makefun/credentials, expires 2026-12-15). Still to do: sign in with it at submit time.
- [ ] Transcript bundle: `node cli/makefun.mjs bundle --repo <repo> --out transcripts.tar.gz` from the unpacked kit — MUST be the sessions that built this entry (this session). Do NOT hand-write transcripts.
- [ ] Pre-submit check: `node cli/makefun.mjs check --kit <kit> --repo <repo> --transcripts transcripts.tar.gz`
- [ ] Submit: `node cli/makefun.mjs submit --competition token-radar-01 --repo-url <url> --commit <sha> --title "Token Radar radar-3" --bundle transcripts.tar.gz --keypair <keypair>` — max 5/day, 10 total; deadline 2026-12-14 10:00 UTC. NOTE: the v1 bundle (sha 04d36727) is stale after the radar-3 upgrade — re-bundle transcripts after the v2 commit.
- [ ] If the entry places top 10: claim USDC from escrow to the payout wallet above.

## Known limits of this build
- The dashboard's data is the sealed snapshot as of 2026-11-14; it never updates (by design — the grader runs offline).
- "Records no token" is what the snapshot says, never proof a protocol has none.
- Expected values are the entry's own model claims, not prices or predictions of when a token comes.
- The size curve is weak: R² 0.31 in-sample, out-of-sample R² negative (the curve ranks comps better than the mean, Spearman 0.49 on 5-fold, but its absolute errors are wide — median factor x3.25). The value band (x5.76) is honest about that. Farm verdicts use the band's low end, so they are conservative by construction.
- The farm pool (10% of implied value) and farmed TVL (1% of protocol TVL) are stated assumptions, not facts from the snapshot; the netting is only as good as those assumptions.
