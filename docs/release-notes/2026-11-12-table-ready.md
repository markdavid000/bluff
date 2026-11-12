---
date: 2026-11-12
branch: feat/table-ready
base: dev
scenario-impact: needs_automation
---

# Tables wait for the host, and players mark themselves ready

A full table no longer starts by itself. Every seated player marks themselves ready or not ready, everyone can see it, and the host starts once the others are ready. Leaving before the start frees only your own seat, so one player leaving a free table no longer ends it for everyone.

## Changes

- **`Bluff` 1.1.0:**
  - **No automatic start.** `joinFreeTable` only seats the player. `startIfFull` and `_startIfFull` are gone.
  - **Ready marks.**
    - `setReady(id, isReady)`, for seated players at a `Waiting` table, emits `PlayerReady(id, player, ready)`.
    - Marks are kept in a mapping appended to the end of `BluffStorage`, which is ERC-7201 safe; `Seat` is unchanged.
    - A leaver's mark is cleared, so a returning player starts not ready.
  - **`startTable`** now also needs every seated player other than the host to be ready, or reverts with `NotEveryoneReady(id)`. Free tables roll at once; paid tables start the payment check.
  - **`TableFull(id)`.** A full waiting table refuses new players. Before, a full table had always started, so the status check alone kept it closed. Paid joins revert as a whole, so the payer's chips are untouched.
  - **The open list.** A full waiting table leaves the open list, and a public one returns when a seat frees up.
  - **`getTable`.** `SeatView` gains `ready`.
- **`BluffCashier` 1.1.0:** the pay-and-join callback no longer starts the table.
- **The web app:** plain sentences for the two new refusals, "Wait until everyone at the table is ready." and "That table just filled up. Try another one, or start your own."
- **Docs:**
  - the contract reference: functions, events, errors, views and sizes, including `ChipFaucet`'s size, which had been stale since 1.1.0;
  - the game-flow ADR's waiting room, edge cases and diagram;
  - the computer-player ADR: the bot marks itself ready;
  - the contracts plan.
- **Size budget.** The size test's required headroom in `Bluff` is lowered from 2,048 to 1,536 bytes, approved by the maintainer. `Bluff` is 22,946 bytes, with 1,630 bytes of room.

## Removed

- `Bluff.startIfFull`, `_startIfFull`, `IBluff.startIfFull`, the cashier's call to it, and the test that only the cashier could call it.
- The game-flow ADR's rule "the table starts by itself when the last seat is filled".

## Verification

- **Hardhat:** 199 passing. The new `ready.test.ts` has 17 tests:
  - a full table, free or paid, waits;
  - the open list, including private tables;
  - toggling, events and the seat view;
  - every `setReady` refusal, and toggling while paused;
  - a leaver's mark is cleared;
  - `startTable` waits for every non-host;
  - paid tables start the payment check;
  - a part-full table can start;
  - only the host may start;
  - leaving a full free or paid table never moves the other player;
  - `startIfFull` is gone.
- **Full tables:** `tables.test.ts` and `callback.test.ts` prove a full table refuses a third player, for free and paid joins, with the payer's chips untouched. These failed before `TableFull` existed.
- **Existing tests:** game tests start tables through the updated `startFreeGame` and `seatPaidTable` helpers, which mark players ready and have the host start. Tests that asserted the old automatic start now assert the host start.
- **Coverage:** 100% of lines and functions in every contract; branches 95.86%.
- **Storage layout:** `validate-layout:sepolia` confirms `Bluff` and `BluffCashier` are safe upgrades of the 1.0.0 implementations on Sepolia.
- **Web:** 208 tests passing, including the two new sentences.
- **Preflight:** `pnpm preflight` passed.
- **Not yet:** the upgrade on Sepolia and the two-account run (free and paid). This runs after CI passes; the results are added to this note before merging.
