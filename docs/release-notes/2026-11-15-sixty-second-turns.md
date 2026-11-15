---
date: 2026-11-15
branch: feat/sixty-second-turns
base: dev
scenario-impact: none
---

# A full minute to make your move

The turn ring around the thinking player's face now drains over 60 seconds instead of 30, the last step of the approved rule fixes.

## Changes

- **`useGame`:** `TURN_SHOWN_MS` is 60 seconds. The contract allows 75 since the `Bluff` 1.3.0 upgrade, and the screen keeps its 15-second grace for a move to land. The "time is nearly up" warning still comes at ten seconds.

## Removed

- Nothing.

## Verification

- `use-game.test.tsx`: red then green; a fresh turn shows 60 seconds and a full ring, halfway it shows half, and ten seconds before the shown end it warns.
