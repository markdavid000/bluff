---
date: 2026-11-25
branch: perf/keep-computer-ready
base: dev
scenario-impact: none
---

# A computer is always ready

Builds the approved [ADR-2026-11-25-keep-a-computer-ready](../adr/ADR-2026-11-25-keep-a-computer-ready.md). **No contract change, no web change, no new package.**

On 2026-11-25 a second account asked for the computer while Baba Dice was busy, and Mama Dice took almost two minutes to sit down. It was her first game ever, so the request waited while the bank funded her wallet and she saved her name and face, before she could join. The service log shows 35 s for the name alone, then 13 s to join and get ready.

## Changes

- **`player-pool.ts`:**
  - `ensureSpare()` sets up the next computer (gas money, name and face) whenever none is free, one at a time. It never fails: a problem is logged as `spare failed` and tried again next time, and a finished setup is logged as `spare ready`.
  - `acquire()` waits for a computer that is already being set up rather than starting a second setup. It still sets one up itself if nothing is ready, as before.
  - `finishGame()` refills a computer's gas after its game and then frees it, so the next request doesn't wait for a top-up.
- **`seat-service.ts`** starts readying the next computer as soon as it hands one out, so that setup overlaps this game's join.
- **`main.ts`** readies a spare after startup, and finishes each game through `finishGame()`.
- **ADR-2026-11-18** is corrected: setting up a new computer takes about a minute on Sepolia, not "a few seconds".

## Verification

- **Vitest:** red first (11 failing tests across the pool and the seat service), green after. The tests cover:
  - a spare set up ahead of time;
  - a request taking it with nothing left to do;
  - one setup at a time;
  - a request waiting for the setup in progress;
  - a failed setup and an unreadable bank, both logged without failing;
  - nothing set up while the bank is low or every computer is playing;
  - the gas refilled after a game.
- **`pnpm preflight`.**
- **On Sepolia:** see the pull request.
