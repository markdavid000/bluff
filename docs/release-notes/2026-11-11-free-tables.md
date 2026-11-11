---
date: 2026-11-11
branch: feat/free-tables
base: dev
scenario-impact: none
---

# Free tables and the waiting room

Players can now create a free table (public or private), join one, leave the waiting room, and start a game, either by the host with two or more players or automatically when the last seat fills. A table that waits more than 10 minutes can be cancelled by anyone seated.

## Changes

- `Bluff`: table and seat types and storage (complete now, because seats live in an array that cannot grow fields after deployment), `createFreeTable`, `joinFreeTable`, `startTable`, `leaveTable` (waiting room only), `cancelTable`, and the views `getTable`, `openTables`, `openTableCount`, `tableOf`.
- One table per player. The host role passes to the next player to have joined. The last player out closes the table.
- A paginated list of public waiting tables, with `TableListed` and `TableUnlisted` events so the lobby updates without re-reading the list.
- Pausing stops new tables and joins only; leaving and starting still work.
- Tests: `tables.test.ts` and `waiting-room.test.ts`, and pause-scope tests in `admin.test.ts`.
- solhint: `gas-indexed-events` is off; every event already indexes the table id and player, and an event can index at most three fields.
- `scripts/slither.sh` now analyses every contract before reporting failures.

## Removed

- `TableFull`: a table starts the moment its last seat fills, so a late joiner gets `WrongStatus`; the plan is updated.
- The paid-table check in `joinFreeTable` and `InvalidBuyIn` until paid tables exist in build step 7, so no unreachable code ships.

## Verification

- 65 contract tests pass; coverage is 100% of lines and 99% of branches. The one untested branch is unreachable: listing a brand-new table always succeeds.
- Slither: no medium or higher findings in any contract.
- `pnpm preflight` passes.
