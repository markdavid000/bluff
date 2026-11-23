---
date: 2026-11-23
branch: feat/learn-pages
base: dev
scenario-impact: none
---

# How to play and Why it's fair

PR 6-1 of the [learn and watch plan](../plans/2026-11-23-learn-and-watch-plan.md). It adds two public pages that anyone can open without signing in. **No contract change, no new package.**

## Changes

- **`/how-to-play`:** the rules from `docs/how-to-play.md`, laid out as raised cards:
  - the dice each player gets, with real dice pictures;
  - ones are wild, with the counting dice ringed;
  - your turn, and the "at least" example;
  - when a bluff is called, winning, time and leaving, and "Is it fair?".
- **`/fairness`:** five promises in plain words, each with a "How it works" detail for the curious:
  1. Nobody can see your dice.
  2. Nobody chooses the dice.
  3. A called bluff shows every die, with proof.
  4. The computer plays by the same rules.
  5. Chips stay private too.

  Then "Check it yourself", with links to each contract's verified source on Etherscan (built from the deployed addresses), the confidentiality tests and the repository. This is the one feature allowed technical words.

- **Both pages:**
  - they live in a new `(learn)` route group, with a light layout: the street backdrop, the name and the screen controls, and no game code loaded;
  - each has its own title and description;
  - both end with **Sit down and play** and a link to the other page.
- **Lobby:** quiet **How to play** and **Why it's fair** links under the card.
- **`TileLink`:** a real link with the raised-tile look, using the button's styles, now in `tile-variants.ts`.
- **Docs:**
  - `docs/how-to-play.md` points to the fairness page, instead of a "How is this fair?" link that never existed at tables, and says the page mirrors it;
  - `docs/architecture.md` lists the `rules` and `fairness` features and the `(learn)` group;
  - the plan for PR 6 is added.

## Verification

- **Vitest:**
  - the rules render every section in order, with the dice per player and spoken labels for the dice pictures;
  - the fairness promises show, with details hidden until opened;
  - every contract link matches the deployed addresses;
  - outside links open in a new tab;
  - both pages lead on to playing;
  - the lobby links are there.
- **Smoke test:** `/how-to-play` and `/fairness` join the open routes, so the production build must serve both without sign-in.
- **Live:** both pages load without signing in, and the lobby links show under the card.
