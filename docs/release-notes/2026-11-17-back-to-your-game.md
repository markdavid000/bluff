---
date: 2026-11-17
branch: feat/back-to-your-game
base: dev
scenario-impact: needs_automation
---

# If you have a seat, the app takes you to it

While you're seated at a table, opening any other page of the game, whether the lobby, **Your games**, the welcome page or another table's link, takes you straight to your table. You see "Getting your seat ready…" for a moment, never the page you were heading to. This builds the approved [ADR-2026-11-17-back-to-your-game](../adr/ADR-2026-11-17-back-to-your-game.md).

## Changes

- **`useWelcomeGate`:** reads `useMyTableId()`. A named player who's seated somewhere other than their own `/table/X` is sent there with `router.replace`, and the gate keeps its loading view until the page is right.
  - **Seat still loading:** the gate waits.
  - **Seat read failed:** the page shows, and the 6-second re-read redirects later if a seat turns up.
- **No bounce after a seat ends:** a new shared `src/hooks/use-left-tables.ts` remembers seats that ended in this session.
  - `useForgetMyTable` now marks a seat as gone on every path: Leave, Close, a mid-game leave, a finished game and a cancelled table.
  - The gate never redirects to a gone seat, so a lagging node that still reports it can't pull you back.
  - The memory clears once the chain reports a different seat, so sitting at that table again works.
- **No flash when sitting down:** `useGoToTable` notes the table it's taking you to (`headToTable`), and the gate leaves that move to it until you arrive.
- **Moved:** the table page's left-table memory (`markLeftTable`) now lives in `use-left-tables.ts`, with no change in behaviour.

## Removed

- The lobby's **Back to your table** card (`back-to-table-card.tsx`) and its copy (`yourTable`, `seatedAt`, `backToTable`), now unreachable.
- The lobby's `seatedAt` branch, and its two tests.
- `useSitDown().goingTo`, which only that card used.

## Verification

- **Vitest, test first:**
  - the gate sends a seated player from `/play`, `/history`, `/welcome` and another table to their own;
  - it shows their own table;
  - it waits while the seat is loading, and shows the page when the read fails;
  - it never pulls a player back to a table they left or a game that ended, and does again once they sit there;
  - it leaves a move that's already underway alone;
  - `useGoToTable` notes where it's heading;
  - all 932+ web tests pass.
- **Live with Favour and Mark (free tables):**
  - creating a table went lobby → table with no loading flash;
  - while seated, the header logo (lobby), a full load of `/history` and an old table's link each landed on the table, and the lobby never drew;
  - leaving a waiting table stayed in the lobby for 28 s;
  - leaving mid-game showed Mark the results card, and both players went back to the lobby and stayed there;
  - no console errors.
