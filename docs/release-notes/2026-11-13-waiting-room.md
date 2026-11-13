---
date: 2026-11-13
branch: feat/waiting-room
base: dev
scenario-impact: needs_automation
---

# Every table has its own page, with a waiting room

Sitting down now takes the player to `/table/12`, where everyone at the table sits around the board with their face, name and a ready mark. Guests mark themselves ready, the host starts once they are, and everyone hears about joins, leaves, ready changes and host changes. Anyone who opens a table link can join from that page.

## Changes

- **`/table/[id]`**, inside the protected `(game)` group:
  - **The waiting room:** seat badges around the 3D board, with a green tick for ready, a grey dot for not ready and a trophy on the host; an Invite button on each empty seat; one line saying what happens next; a countdown to the 10-minute limit.
  - **The dock:** I'm ready / Not ready for guests (the mark flips at once), Start the game for the host (held until everyone else is ready), Copy invite link while seats are free, Close the table once time is up, and Leave.
  - **Visitors:** the table, its players and its buy-in, with Join or Pay and join, or why they can't ("This table is full", "This game has started", or a chips problem).
  - **After the start:** "Your game is on", with a Leave that asks first, until the game screen arrives in PR 5.
  - **Closed tables** and **unknown ids** each get a card with a way back to the lobby.
- **Notices** to everyone else at the table: joined, left, ready, not ready, new host, removed for not paying, table closed, checking payments, open again and game starting. A player's own moves are never echoed.
- **The keeper:** each seated player's app sends the payment check, cancels a stuck check, and closes an expired table with fewer than 2 players. The host goes first, then each other seat 8 seconds later, re-reading the table before sending so nobody pays for a duplicate. It stays quiet unless it fails twice.
- **The block clock:** table reads are pinned to the newest block seen in receipts, events and new blocks, so an older answer never replaces a newer one and the ready mark doesn't flicker back.
- **Shared pieces:** `useTakeSeat` (free and paid seats, returning the table id), `usePlayerProfiles`, `table-links`, `join-request`, `whyUnaffordable`, and `useAction` returning its result to `onDone`.
- **The street along the bottom** now runs under every game screen (welcome, lobby and every table) from the `(game)` layout, instead of only the lobby. The sign-in screens keep their own scene.
- **Fixed: a crash when a player joined.** The app keeps showing the last answer while a new one loads, so when a second player joined, the names-and-faces read still had the answer for one player and ran past its end. It now waits for the real answer, and an answer in an unexpected shape is reported as a failed read, never guessed. The header's own name and face had the same weakness after switching accounts, fixed the same way.
- **Fixed: "Connector not connected" when opening chips.** Bluff's own wallets could be asked to sign while the wallet was still reconnecting after a reload. Signing now waits until the wallet is fully connected.
- **Fixed: a false "keeper problem".** A keeper checked the table, then spent seconds decoding the payment check, while another player's keeper finished it first. The late one was refused and counted that as a failure. Keepers now check again after decoding, and a refusal because someone else already did the job counts as done.
- **Fixed: "We could not find that table" after pasting an invite.** The table page read the table as of the newest block the tab remembered, and in the lobby that could be minutes old, from before the table existed. A table the page hasn't shown yet is now read as of the latest block, "not found" from a read pinned to an older block is never trusted, the clock catches up with the chain as soon as a table page opens, and another table's answer is never shown while this one loads.
- **Roomier modals:** every modal is wider (672px, and the open-tables list 1152px), has more padding inside (40px on larger screens), groups related lines tightly and leaves clear gaps between sections. A modal taller than the screen scrolls inside itself. On phones every modal is a sheet that slides up from the bottom edge, full width, up to 90% of the screen tall; with reduced motion it fades instead of sliding.
- **The header on phones:** the player button shows only the face, and night mode, sounds and music move into the player's card, so the logo, chips and face fit on one line without overflowing.
- **The lobby:** sitting down moves the player to their table, a seated player sees a **Back to your table** card, and invite links read `/table/12` (the paste box still takes a number or a full link).

## Removed

- The lobby's `?join=` handling, `InviteCard`, `MyTableCard`, its `use-table`, `use-leave-table` and `use-leave-confirm` hooks, and 18 lobby strings only they used.
- The `/play?join=` invite link form.

## Verification

- **Vitest:** the block clock, `useSendMove` reporting blocks, `usePlayerProfiles`, `useTakeSeat`, `table-links`, `join-request`, `whyUnaffordable`, `useTable`, `useTableEvents` and its notices, `nextStep`, `useWaitingRoom`, the keeper's duties and its timer hook, and `TableScreen` in every status and role: loading, not found, failed with retry, closed, host, guest, visitor (free, paid, full, started), confirm in wallet, and the started game's leave confirmation.
- The lobby's tests cover the move to the table and the Back to your table card.
- **Red before green:** the join crash, the stale header name and the early signing each had a failing test first.
- **Running app:** see the pull request for the two-account walk-through.
