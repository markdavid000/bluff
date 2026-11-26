---
date: 2026-11-25
branch: fix/computer-service-hardening
base: dev
scenario-impact: none
---

# A sturdier computer service

From the 2026-11-25 review of `apps/bot` before it moves to Fly.io. **No contract change, no web change, no new package.**

## What went wrong, and what changed

- **A computer could be stranded at a table.** If its join landed but the confirmation failed, the service freed it anyway. Every later request picked the same computer and failed with `AlreadyAtTable` (503) until a restart.
  - Now, after any failed join, the service checks `tableOf` first. If the computer is seated at this table, it carries on playing it and answers "seated". If it's seated elsewhere, it plays that table and never frees it.
- **A lost race retried for minutes.** The 15-second patience counted sleeps, not time, and each retry checked the join at the same old block. One losing request sent 17 doomed joins over 3 to 4 minutes, then answered 503.
  - Patience is now measured in real time, and each retry uses the newest block.
  - A join that reverts on-chain (`MoveReverted`) re-reads the table and answers "full" or "not-waiting".
- **The rate limit could be dodged.** It keyed on the caller-supplied first `X-Forwarded-For`.
  - It now keys on Fly's `Fly-Client-IP`, falling back to the socket address.
  - Callers seen more than 10 minutes ago are forgotten once 1,000 are remembered.
  - No more than `MOST_SEATING` (4) tables are seated at once; others get "all-busy".
  - A missing table is checked every 3 s instead of every 1 s.
  - Table numbers above uint256 get a 400.
- **A resend could say "taken" after the computer had sat down.** A request for a table where one of our computers already sits now answers "seated". Two requests for the same table share one attempt.
- **Stale dice and doomed moves:**
  - The computer's dice and reveal handles are read at the newest block it has seen, not "latest" from any node.
  - It never acts on a dice count that doesn't match its seat. That's treated as "not ready", within the turn's time limit.
  - Moves are checked at the newest block known, not an old pinned one.
  - Reads that a lagging node answers with "resource not found" are retried briefly (`lagging.ts`).
- **`/health`** keeps its answer for 30 s, and serves the last one if the network stumbles, so Fly's checks don't spend the RPC or fail on a blip.
- **Startup and shutdown:**
  - The first reads retry with growing waits (`startup.ts`) instead of exiting.
  - `SIGINT` stops the service like `SIGTERM`.
  - On restart, every seated computer is resumed, even after an unnamed one.
- **Quieter logs:** "search behind" at most once a minute, and "reveal not ready" at most every 30 s.

## Verification

- **Vitest:** red first for each item, then green.
  - The slow-join test showed 16 attempts before the fix.
  - The spoofed-header test let every request through before the fix.

  All 161 bot tests pass.

- **`pnpm preflight`:** including the bot build and smoke test.
- **Not yet run against Sepolia:** that comes with the Fly.io deploy.
