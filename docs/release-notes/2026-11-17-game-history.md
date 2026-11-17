---
date: 2026-11-17
branch: feat/game-history
base: dev
scenario-impact: needs_automation
---

# Look back at every game you've played

A new **Your games** page lists every game you've played, newest first, with how each one went. Open it from **Your games** in your profile. PR 10-2 of the [profile and history plan](../plans/2026-11-17-profile-and-history-plan.md).

## Changes

- **Your games (`/history`):** a card per game, showing:
  - the table;
  - when it started;
  - the result, as a coloured tag: Won, Shared the win, Lost, Left early, Stopped and refunded, or Still going;
  - the players' faces;
  - free, or the chips won or lost.
- **Show more:** the page shows 20 tables at a time. Tables that never started are left out.
- **Details:** pressing a game opens:
  - every player, with their dice left;
  - how it ended and who won;
  - when it started and how many rounds it had;
  - for paid games, the pot and each winner's share.
- **States:**
  - loading: placeholder cards;
  - no games: "No games yet. Play one!" with Play now;
  - failed: Try again;
  - "That's every game you've played." at the end.
- **Profile:** **Your games** joins Change name, Change face, Game tips and Sign out.
- **Sign-in:** `/history` is behind sign-in, like the other game pages (route guard, proxy matcher, smoke test).
- **How games are found:** with no contract change, as the [ADR amendment](../adr/ADR-2026-11-16-profile-and-game-history.md) says:
  - the app searches `Bluff`'s `PlayerJoined` and `PlayerLeft` events for you through a log-friendly public service (`logsClient`), from `Bluff`'s first block in 50,000-block spans;
  - it reads the tables with `getTable`, and how each ended from `GameEnded`;
  - it remembers what it found in the browser, so later visits only search new blocks.
  - On a new device, or after clearing browser data, the first visit searches everything again. Nothing is lost.

## Removed

- Nothing. The contract change in the original ADR was dropped before it was merged.

## Verification

- **Vitest:**
  - the result rules: won, shared, lost, left, stopped, still going, not found, and the chips for each;
  - which tables count as your games;
  - leaving the waiting room and coming back;
  - block spans and merging;
  - the browser memory, including a damaged save;
  - the hook's loading, empty, failed and retry states, Show more, and searching only new blocks;
  - the screen's states and its details dialog;
  - the profile link;
  - the route guard, through the existing route-coverage test, which failed until `/history` was protected.
- **Live on Sepolia, as Favour:**
  - the page listed real games with the right results;
  - the details matched;
  - Show more went from 13 to 28 games;
  - the browser memory held 61 joins and 41 leaves;
  - opening from the profile showed the games in about 1.8 s;
  - no console errors.
