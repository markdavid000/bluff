# Plan: rule fixes from the audit

- **Decision:** [ADR-2026-11-14-rule-fixes.md](../adr/ADR-2026-11-14-rule-fixes.md) (approved)
- **Branch:** `fix/rule-fixes`, cut from `origin/dev`

## Files to touch

| File                                                             | Change                                                                                                     |
| ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/contracts/contracts/libraries/TableRules.sol`          | `TURN_LIMIT` 45 s → 75 s. `dicePerPlayer` takes a player count.                                            |
| `packages/contracts/contracts/Bluff.sol`                         | `_endGame` and `_cancel` clear `tableOf` only when it points at this table. `_beginPlay` deals by players. |
| `packages/contracts/test/unit/leaving.test.ts`                   | Red test: a leaver's seat at a new table survives the old game ending.                                     |
| `packages/contracts/test/unit/rounds.test.ts`                    | Red test: a 4-seat table started with 2 players deals 4 dice each.                                         |
| `packages/contracts/test/unit/{timeouts,bidding,rounds}.test.ts` | The turn limit constant becomes 75.                                                                        |
| `apps/web/src/features/lobby/copy.ts`                            | "N dice each" becomes "N dice each when full".                                                             |
| `docs/how-to-play.md`, `docs/contracts.md`                       | 60 seconds a turn; dice dealt by the players who start.                                                    |

The web app's shown turn (`TURN_SHOWN_MS`, 60 s) lives in the game screen from PR #41, which isn't on `dev` yet. It follows in a small web PR once #41 merges. Until then the screen subtracts its 15-second grace from a 75-second deadline, so the ring starts full and drains over the last 30 seconds: nothing breaks.

## Interfaces and storage

No storage layout change: `dicePerPlayer` keeps its slot and is rewritten at the start of play. No new events, errors or functions. `TableCreated` still emits the full-table dice count.

## Test strategy

Red then green in Hardhat for both behaviour changes, then the full suite, coverage gate, Slither and `validate-layout` against Sepolia. The Sepolia upgrade of the `Bluff` proxy runs only after the maintainer approves that step.

## Removed

Nothing. The seat-count meaning of `dicePerPlayer` at creation stays, as the "when full" number.
