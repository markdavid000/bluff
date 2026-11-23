---
date: 2026-11-23
branch: fix/duplicate-keys
base: dev
scenario-impact: none
---

# Fix React's duplicate key warning in the game

React warned "Encountered two children with the same key" during games. Two lists could repeat a key.

## Changes

- **Round history after Play again:**
  - **The cause:** the history reads the table's recent events and groups them into rounds, keyed by round number. A reopened table played again starts at round 1, so the previous game's rounds came back with the same numbers. That gave two "round 1" sections, and the history mixed in rounds from the earlier game.
  - **The fix:** the history now also reads `GameStarted` and starts over at each one, so it shows only the game being played.
- **Reveal card:**
  - **The cause:** each player's row was keyed by name, which repeats when two players are both unnamed ("Player") or before names load.
  - **The fix:** rows now carry their seat number and are keyed by it.

## Verification

- **Vitest, each test red first:**
  - a replayed table shows only the current game's rounds, with no repeated round numbers;
  - the history search asks for `GameStarted` (fails with that line removed);
  - two players with the same name give two reveal rows without React's duplicate key warning.
- **Live:** the lobby and Your games load with no key warnings in the console.
