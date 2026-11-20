---
date: 2026-11-20
branch: feat/play-computer
base: dev
scenario-impact: needs_automation
---

# Play the computer, and Quick play

PR 8-3 of the [computer player plan](../plans/2026-11-18-computer-player-plan.md), building [ADR-2026-11-18-computer-player](../adr/ADR-2026-11-18-computer-player.md). Anyone can now start a game against the computer from the lobby. **No contract change.**

## Changes

- **Play the computer** (lobby), beside Quick play:
  - creates a free, public table for two through the usual create path and action status;
  - asks the computer service (`POST /seat`) to sit down, retrying a sleeping service 3 times over about 20 s with "Waking the computer…";
  - keeps the player in the lobby, showing "Setting up a game with the computer…", until the computer is seated **and ready**, then opens the waiting room. The player never sees the computer "Not ready". The table is claimed as the player's destination as soon as it exists, so the "back to your table" redirect doesn't open it early;
  - if the computer can't come, the player still lands at their table, with a toast saying why: a person sat down first, the computer is busy, too many requests, it can't play right now, or it couldn't be reached.
- **Quick play** is the new name for Play now: the lobby, the empty open-tables list, the empty Your games page, the design page and how-to-play. Its behaviour is unchanged.
- **Computer badge:** on the computer's seat in the waiting room and in the game, and in a past game's details, from `config/computer-players.ts` (the 20 public addresses).
- **`useAction`** gains `patienceMs`, so a known-slow action can wait longer before saying the network is busy. Play the computer waits 60 s.
- **`NEXT_PUBLIC_BOT_URL`:** the service's public address, in `.env.example`, CI and the architecture doc.
- **Computer service:** its "unavailable" reply now carries CORS headers, so the browser can read it rather than seeing a network failure.
- **Docs:** the ADR describes waiting for the ready computer; the architecture doc lists `NEXT_PUBLIC_BOT_URL` and the address list.

## Verification

- **Vitest:**
  - the seat request: seated, taken, busy, too many, other refusals, waking and retrying, giving up, a slow answer, and a service failure not retried;
  - Play the computer: the create, then the seat, then the table, holding the player until ready, the waking message, each refusal toast, an unexpected failure, and a failed create staying in the lobby;
  - the lobby button;
  - the badge on both kinds of seat and in the details;
  - the patience option;
  - the address list.
- **Live on Sepolia,** with Mark (Google) and the service run locally. The first try opened the waiting room early, through the back-to-your-table redirect, and showed Baba Dice "Not ready" for about 25 s. A test reproduced it, and with the fix Mark stayed in the lobby and arrived to Baba Dice already **Ready**, with the Computer badge.
