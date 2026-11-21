---
date: 2026-11-20
branch: feat/play-computer
base: dev
scenario-impact: needs_automation
---

# Play the computer, and Quick play

PR 8-3 of the [computer player plan](../plans/2026-11-18-computer-player-plan.md), building [ADR-2026-11-18-computer-player](../adr/ADR-2026-11-18-computer-player.md). Anyone can now start a game against the computer from the lobby. **No contract change.**

## Changes

- **Play the computer** (lobby), beside Quick play, both centred in the card:
  - creates a free, public table for two through the usual create path and action status ("Setting up your table…"), then takes the player straight to the waiting room;
  - asks the computer service (`POST /seat`) to sit down in the background, retrying a sleeping service 3 times over about 20 s;
  - in the waiting room, one toast follows the computer: "Waking the computer…" while a sleeping service starts, "The computer is joining…" until it sits down, "The computer is getting ready…" until it's ready, then it clears. It's driven by the table itself (`computerArrival`) and the call's progress (`useComputerCall`, a small shared store, so the call outlives the lobby);
  - if the computer can't come, the same toast says why: a person sat down first, the computer is busy, too many requests, it can't play right now, or it couldn't be reached.
- **No invites while the computer is on its way:** the empty seat becomes the computer's place (a dashed seat with the Computer badge and "Joining…"), and the Copy invite link button is hidden, so nobody can take the computer's seat by mistake. If the computer can't come, both invites come back, matching the toast that says the table is open for people. Tables with people are unchanged.
- **Quick play** is the new name for Play now: the lobby, the empty open-tables list, the empty Your games page, the design page and how-to-play. Its behaviour is unchanged.
- **Open tables leaves out the player's own table,** so making a table through Quick play or Play the computer no longer briefly shows "1" on the button.
- **Open tables and Quick play leave out a table a computer was left holding.** Computers never create tables; they only become host when the person leaves. So a table hosted by a computer is never shown or joined while the computer is on its way out.
- **Table toasts use the real name of someone who just arrived.** A computer joins and gets ready in one block, so its "is ready" event came before its name was loaded, and the toast said "Player is ready". The events hook now reads any name it doesn't know yet before showing the toast, so it says "Baba Dice is ready", and the same goes for any person.
- **No "is now the host" toast when a computer becomes host,** which only happens as its person leaves; the player just sees "You left the table". With people, nothing changes: when the host leaves, everyone, including the one leaving, is still told who the new host is.
- **Computer badge:** on the computer's seat in the waiting room and in the game, and in a past game's details, from `config/computer-players.ts` (the 20 public addresses).
- **Toast fix:** a working toast that got new words just after news pushed it out could vanish, because the toast library finished removing the old copy and took the new one with it. Each showing of a toast now has its own id, stale copies are dismissed until they're gone, and an unmounted toast host stops acting.
- **`NEXT_PUBLIC_BOT_URL`:** the service's public address, in `.env.example`, CI and the architecture doc.
- **Computer service:**
  - its "unavailable" reply now carries CORS headers, so the browser can read it rather than seeing a network failure;
  - **it leaves straight after the player.** Its leave estimated gas while it was alone (134k, closing the table), but the player rejoined in the same block, and leaving with someone there costs 408k, so the leave ran out of gas and a second try was needed. Every computer move now gets at least 1.5× its estimate, and never less than 600k (unused gas isn't charged), so the leave lands in the block after the player's;
  - **it joins and gets ready in the same block:** both transactions are sent back to back with consecutive nonces, instead of waiting a block between them. If only the ready fails, the seat is kept and the seat gets ready itself;
  - it checks for its transactions every second instead of every 4, and retries a just-made table every second instead of every 3.
- **The app checks for its own moves every second** instead of every 4, so every move, not just this one, feels quicker.
- **Docs:** the ADR describes the waiting-room toast; the architecture doc lists `NEXT_PUBLIC_BOT_URL` and the address list.

## Verification

- **Vitest:**
  - the seat request;
  - the call store;
  - the arrival rule (joining, waking, getting ready, arrived, refused, table over);
  - the arrival toast (one toast changing, the reason kept, cleared on leaving);
  - Play the computer (the create, the call, straight to the table; a failed create stays in the lobby);
  - the lobby button;
  - own tables left out of Open tables;
  - the toast fix (red first);
  - the badge on both kinds of seat and in the details;
  - the address list.
- **Speed, live:**
  - Mark's leave landed in block 264, and the computer's leave and the table closing in block 265, 12 s later, on the first try. Before, it took 24 s with a failed try;
  - the computer arrived already Ready, with join and ready in one block, 40 s after the press instead of 52 s. What's left is Sepolia's 12 s blocks: Mark's table, then the computer's block, plus a lagging public RPC at times.
- **Live on Sepolia,** with Mark (Google) and the service run locally:
  - "Setting up your table…" in the lobby, with Open tables at 0 throughout;
  - the waiting room after 14 s, with "The computer is joining…";
  - Baba Dice sitting down at 40 s, with "The computer is getting ready…" staying on screen. Before the toast fix it vanished at this point, and a test reproduced it;
  - "Baba Dice is ready" at 52 s, and the toast cleared.
