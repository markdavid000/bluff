# The waiting room: plan

PR 4 of the [web app plan](2026-11-11-web-app-plan.md#9-build-order), built on [ADR-2026-11-12-waiting-room-and-ready](../adr/ADR-2026-11-12-waiting-room-and-ready.md) and the contracts it upgraded (`Bluff` 1.1.0).

## What players get

- **`/table/[id]`, a page for every table.** The waiting room sits on the 3D board, with each seated player's face and name on their side.
  - A ready mark on each face: a green tick for ready, a grey dot for not ready.
  - A crown on the host.
  - An **Invite** button on each empty seat.
- **One line says what happens next:**
  - "Waiting for 1 more player";
  - "Waiting for Kola to get ready";
  - "Everyone is ready. Start the game";
  - "Everyone is ready. Waiting for the host to start".
- **The action dock** holds only what this player can do now:
  - **Ready** / **Not ready** for players other than the host. The mark flips at once and shows "Getting ready…" until the move lands, about 12 seconds.
  - **Start the game** for the host, held until everyone else is ready.
  - **Copy invite link** while seats are free.
  - **Leave the table.**
- **A countdown badge** shows the 10-minute waiting-room limit. After it, anyone seated may cancel the table, and the keeper does it automatically when fewer than 2 players are left.
- **Notices to everyone else at the table**, never echoing the player's own move:
  - "Kola joined the table";
  - "Kola left the table";
  - "Kola is now the host";
  - "Kola is ready" / "Kola is not ready";
  - "Kola was removed for not paying";
  - "The table was closed";
  - "The game is starting".
- **Paid tables:**
  - after the host starts, the page shows "Checking everyone paid…";
  - the keeper sends `confirmSeats` (the host first, then each other player 8 seconds later, only if it's still due);
  - a failed check reopens the table and names who was removed.
- **Visitors** who open a table link:
  - a waiting table with room: **Join** (or **Pay 25 chips and join**);
  - a full table: "This table is full";
  - a table that has started: "This game has started";
  - an unknown id: the not-found page.
- **After the start:** until the game screen arrives in PR 5, a started table shows "Your game is on" with Leave, which asks first.
- **Lobby changes:**
  - Sitting down moves the player to `/table/[id]`.
  - A seated player who opens the lobby sees a compact **Back to your table** card.
  - Invite links become `/table/12`, and the paste box reads them.
  - `?join=` and the lobby's invite card are removed, since the table page replaces them.

## Screen sketch

```
 ┌──────────────────────────────────────────────────────────┐
 │ Bluff                         ◉ 140 chips  ☼ ♪  (😀 Dave) │
 ├──────────────────────────────────────────────────────────┤
 │                 (👳 Kola #1A2B) ✔ ready                   │
 │            ┌───────────────────────────────┐              │
 │  [ Invite ]│        mahogany 3D board      │ (🧕 Ada) ●   │
 │            │   cups on the seated sides    │   not ready  │
 │            └───────────────────────────────┘              │
 │                 (😀 Dave, you) 👑 host                    │
 │  "Waiting for Ada to get ready"        ⏳ 08:41          │
 │  [ Start the game ]  [ Copy invite link ]  [ Leave ]      │
 └──────────────────────────────────────────────────────────┘
```

## How it works

| Piece                          | Where                                            | What it does                                                                                                                                                                                                                                                                                                                        |
| ------------------------------ | ------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `block-clock`                  | `lib/block-clock.ts`, `hooks/use-block-clock.ts` | The newest block seen from receipts and events. Reads pass `blockNumber` once a block is known, so an older answer never replaces a newer one.                                                                                                                                                                                      |
| `useSendMove`                  | `hooks/`                                         | Reports each receipt's block to the clock.                                                                                                                                                                                                                                                                                          |
| `usePlayerProfiles(addresses)` | `hooks/`                                         | Names and faces for any players, from `nicknameOf` and `avatarOf`, with the same fallbacks as the header.                                                                                                                                                                                                                           |
| `useTable(id)`                 | `features/table/hooks`                           | `getTable` pinned to the clock, refetched when a table event arrives. Loading, not found and failed states.                                                                                                                                                                                                                         |
| `useTableEvents(id)`           | `features/table/hooks`                           | Watches `PlayerJoined`, `PlayerLeft`, `PlayerReady`, `HostChanged`, `SeatVerificationStarted`, `SeatRemoved`, `TableReopened`, `TableCancelled` and `GameStarted` for this table. Advances the clock, refreshes the table, and shows notices for other players' moves.                                                              |
| `useWaitingRoom(id)`           | `features/table/hooks`                           | Ready toggle (optimistic, through `useAction`), start, leave, cancel after the limit, copy invite, and join for visitors.                                                                                                                                                                                                           |
| `useTableKeeper(id)`           | `features/table/hooks`                           | Waiting-room duties: `confirmSeats` while `Verifying`, `cancelVerification` after its limit, `cancelTable` after the lobby limit with fewer than 2 players. The host goes first, then each other seat 8 s later per position; a fresh read just before sending stops a duplicate. Quiet unless it fails twice. Watchers never send. |
| `TableScreen`                  | `features/table/components`                      | Chooses the waiting room, the payment check, "your game is on", or a visitor view from the status and whether the player is seated.                                                                                                                                                                                                 |

## Tests

- **`block-clock`:** it only moves forward, and subscribers hear each change.
- **`useTable`:** loading, not found, failed with retry, a pinned read, and a refresh on an event.
- **`useTableEvents`:** a notice for each event from another player, none for the player's own move, the right names.
- **`useWaitingRoom`:**
  - the ready toggle flips at once and rolls back on failure;
  - Start is held until everyone else is ready;
  - leave, copy invite, and join for visitors (free and paid).
- **`useTableKeeper`:**
  - who goes first and the 8 s stagger;
  - the fresh-read check stops a duplicate;
  - watchers never send;
  - each deadline duty;
  - timers are cleared on unmount.
- **`WaitingRoom` and `TableScreen`:** every status and role (host, guest, visitor, full, started, not found), the lines, held buttons and accessibility.
- **Lobby:** sitting down moves the player to the table, seated players see **Back to your table**, and links read `/table/12`.

## Removed

`?join=` handling and `InviteCard` in the lobby, the lobby's `MyTableCard` (replaced by the compact **Back to your table** card), and `inviteLink`'s `/play?join=` form.
