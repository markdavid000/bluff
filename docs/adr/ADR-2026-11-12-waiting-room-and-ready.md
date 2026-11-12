# ADR-2026-11-12: The waiting room, ready marks and a host-started game

- **Status:** Approved
- **Approved by:** (MarkDavid, 12th Nov 2026; filled in by the maintainer)
- **Companion:** [ADR-2026-11-12-waiting-room-and-ready-for-dummies.md](ADR-2026-11-12-waiting-room-and-ready-for-dummies.md)
- **Amends:** [ADR-2026-11-10-game-flow-and-timing](ADR-2026-11-10-game-flow-and-timing.md), section "Waiting room" and the rule "the table starts by itself when the last seat is filled"

## Context

Today a table starts by itself the moment its last seat fills:

- `joinFreeTable` calls `_startIfFull`.
- `BluffCashier.onConfidentialTransferReceived` calls `Bluff.startIfFull` after every paid seat.
- `startTable` lets the host start at any time with 2 or more players, without asking anyone.

The maintainer tested the lobby (PR 3) on Sepolia with two accounts and found the result surprising:

- **Free table.** When the second player joined, the game started at once. When one player then pressed Leave, `_leaveGame` ended the game for the last player left (`EndReason.OthersLeft`), which cleared that player's seat too. To the second player it looked as if they had been made to leave.
- **Paid table.** It went to the payment check (`Verifying`) when full. Leaving there counts as "before the game" and only frees the leaver's seat, so each player had to leave on their own. The maintainer expects every table to behave this way.

The maintainer has asked for a waiting room where:

- each player appears by their avatar;
- each player has a **Ready** button that toggles to **Not ready**;
- a ready mark is attached to each avatar, visible to everyone;
- toggling sends a toast to the table ("Kola is ready", "Kola is not ready");
- the host presses **Start the game** once everyone is ready.

The app has no server. The contract is the only state every player's browser can read, so the ready marks must live there. Each toggle is then a transaction, sponsored for embedded wallets, and about 5 to 15 seconds to settle.

## Options considered

### A. Keep auto-start, explain the result on screen

No contract change. When a full table starts and someone leaves, the last player wins, and the app says so ("Kola left. You win!").

This doesn't give the maintainer's waiting room or ready marks, and a full table still gives players no moment to get ready before the clock starts.

### B. Ready marks kept in the browser

Free to toggle and instant, but other players can't see them without a server or a peer-to-peer channel, neither of which exists. Rejected.

### C. Host-started tables with ready marks on the contract (chosen)

- No table starts by itself.
- Each seated player toggles a ready mark on the contract.
- The host starts once every other player is ready.

It costs:

- a contract upgrade of `Bluff` and `BluffCashier`;
- one sponsored transaction per toggle.

It gives:

- the requested waiting room;
- a pre-game leave that never moves anyone else;
- one rule for free and paid tables.

## Decision

Upgrade `Bluff` to 1.1.0 and `BluffCashier` to 1.1.0.

- **No automatic start.**
  - Remove `_startIfFull`, the external `Bluff.startIfFull` and its declaration in `IBluff`.
  - `joinFreeTable` only seats the player.
  - The cashier's callback seats and records the payment, and no longer starts the table.
- **Ready marks.**
  - Append `mapping(uint256 tableId => mapping(address player => bool)) ready` to the end of `BluffStorage`. This is safe under ERC-7201. `Seat` stays unchanged, because it's stored in an array and adding a field to it would corrupt existing tables.
  - Add `setReady(uint256 id, bool isReady)`: only for a player seated at a table that is `Waiting`. It emits `PlayerReady(uint256 indexed id, address indexed player, bool ready)`, and reverts with `WrongStatus` or `NotAtTable` otherwise.
  - `_removeSeat` deletes the leaver's mark, so a player who leaves and comes back starts not ready.
  - A new player arrives not ready.
- **Starting.**
  - `startTable` stays host-only, needs `Waiting` and at least 2 players, and now also needs every seated player other than the host to be ready. Otherwise it reverts with the new `NotEveryoneReady(uint256 id)`.
  - Pressing Start counts as the host's ready.
  - Free tables then roll round 1. Paid tables enter the payment check (`Verifying`) as today, and the keeper in PR 4 sends `confirmSeats`.
- **Views.** `SeatView` gains `bool ready`, filled from the mapping, so `getTable` returns everything the waiting room needs in one read.
- **Full tables refuse new players.** `_requireJoinable` reverts with the new `TableFull(uint256 id)` when every seat is taken. Before, a full table had always started, so the status check alone kept it closed; now it can wait full, so it needs its own check. Paid joins pass through the same check, and the whole payment reverts, so the payer's chips are untouched. This was added during the build, after an existing test caught it.
- **The open list.** A full waiting table leaves the open list, and returns when a seat frees up, so the lobby only shows tables with room.
- **Unchanged.**
  - The 10-minute waiting-room limit.
  - Who becomes host when the host leaves.
  - Refunds on leaving before the game.
  - Everything from `Verifying` on.
- **The app (PR 4).**
  - A waiting room on `/table/[id]`: avatars around the board with a ready mark, a Ready / Not ready button, the host's Start button (disabled until everyone is ready, with a line saying who it's waiting for), the invite link and Leave.
  - Your own mark flips at once and shows a small working state until the move lands.
  - `PlayerReady` events show the requested toasts to the other players.
  - After the upgrade, PR 3's lobby card ("Everyone is here. The game is starting.") is replaced by a link into the waiting room.

## Diagram

```
 lobby ──create / join / pay──► waiting room (Waiting) ◄──── a seat frees up ───┐
                                   │  each player: setReady(true|false)          │
                                   │  PlayerReady ─► every browser: mark + toast │
                                   │                                             │
                     host: startTable(id)                                        │
                     needs ≥ 2 players and every non-host ready                 │
                                   │                                             │
              free ────────────────┼──────────────── paid                        │
               │                                      │                          │
          roll round 1                       Verifying (payment check)           │
          Playing                            keeper: confirmSeats ─┬─► Playing   │
                                                                   └─► unpaid seat removed
                                                                       ─► reopen ┘
 leave while Waiting or Verifying ─► only the leaver's seat is freed (refund if paid)
```

## Consequences

- **Better.**
  - A seated player is never moved by someone else's choice before the game.
  - Every table, free or paid, starts the same way.
  - Players get the moment of readiness the maintainer asked for.
  - The full-table auto-start surprise is gone.
- **Costs.**
  - Each ready toggle is a transaction: about 5 to 15 seconds, sponsored for embedded wallets, a wallet prompt and gas for own wallets.
  - A table can no longer start without its host; a host who walks away blocks it until the 10-minute limit lets anyone cancel it.
- **Contract size.** `Bluff` grows by 454 bytes, from 22,436 to 22,890 of the 24,576-byte limit. The size test's required headroom drops from 2,048 to 1,536 bytes, approved by the maintainer on 2026-11-12, leaving 1,686 bytes. Sharing repeated checks would have won back only 268 bytes while touching unrelated functions, so it was not done.
- **Removed:** `Bluff.startIfFull`, `_startIfFull`, the cashier's call to it, their tests, and the game-flow ADR's sentence "the table starts by itself when the last seat is filled". The "host never starts a full table" row becomes "anyone seated may cancel after 10 minutes".
- **Upgrades:**
  - `Bluff` 1.0.0 to 1.1.0 and `BluffCashier` 1.0.0 to 1.1.0, through `upgrade:sepolia` with the storage layout check.
  - Existing waiting tables keep working, with every mark starting false.
  - No packages are added or removed.
- **The app.** PR 3's "Everyone is here" state and its leave confirmation for a game started from the lobby stay valid for games already running; the waiting room supersedes the lobby card in PR 4.

## Verification

- **Hardhat:**
  - a full free or paid table does not start;
  - `setReady` toggles and emits, and reverts for players not seated, for tables not waiting and after the start;
  - `startTable` reverts with `NotEveryoneReady` until every non-host is ready, then starts free and paid tables as today;
  - a leaver's mark is cleared and a rejoin starts not ready;
  - leaving a waiting or verifying table never moves another player;
  - a full table leaves the open list and returns when a seat frees;
  - the upgrade test proves the storage layout is unchanged except for the appended mapping.
- **Confidentiality:** no new encrypted values. The existing `confidentiality.test.ts` must still pass.
- **Sepolia:** two accounts create, join, toggle ready, see each other's marks and toasts, and the host starts. Run once free and once paid, with the payment check confirmed by the keeper.
