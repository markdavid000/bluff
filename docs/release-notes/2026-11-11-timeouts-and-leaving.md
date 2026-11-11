---
date: 2026-11-11
branch: feat/timeouts-and-leaving
base: dev
scenario-impact: none
---

# Timeouts, leaving, the game clock and stuck reveals

Every way a game can stall or end now works. Nobody can hold a table hostage by walking away: anyone can claim a missed turn, a stuck reveal ends the game after 10 minutes, and the 15-minute clock keeps games short.

## Changes

- `claimTimeout(id)`: after the 45-second turn limit, anyone can claim it. The idle player loses a die and the next player starts a new round. A second missed turn removes the player and frees them from the table.
- Leaving a game: the player forfeits and is freed at once. If it was their turn, the turn passes (`TurnPassed`). If one player is left, they win at once (`GameEnded` with `OthersLeft`). A player who leaves during a reveal still has their dice counted, and loses nothing more if they lose the call.
- The game clock: when 15 minutes have passed, the round in progress is the last. The player with the most dice wins, and tied players share the win (`ClockExpired`).
- `cancelStuckReveal(id)`: 10 minutes after a call with no settled reveal, anyone can end the game, shared by everyone still in it (`StuckReveal`).
- An eliminated player can leave without changing the game.
- Events `TurnTimedOut` and `TurnPassed`.

## Removed

- The waiting-room test asserting that players cannot leave a game in progress; leaving now forfeits.

## Verification

- 117 contract tests pass; coverage is 100% of lines and 99% of branches. The one untested branch is unreachable: listing a brand-new table always succeeds. The inactive-seat branches deferred from build step 4 are now covered.
- Slither: no medium or higher findings.
- `pnpm preflight` passes.
