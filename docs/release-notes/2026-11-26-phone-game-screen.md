---
date: 2026-11-26
branch: fix/phone-game-screen
base: dev
scenario-impact: none
---

# A game screen made for phones

From the maintainer's screenshots on 2026-11-26.

- **The top bar:** the Bid badge sat on top of the Time badge and Leave.
- **The rounds history:** there was no way to see it on a phone.
- **Four players:** worked out on paper, the side seats would have left the board about 100 px wide, with bid pills running over it.

**No contract change, no new package.**

## Changes, on screens narrower than 40rem (about 640 px)

- **Opponents sit in one row above the board,** in seat order. Each uses a compact seat (`GameSeat compact`):
  - a 40 px avatar with the turn ring;
  - a short name;
  - their dice as one "? 4" count instead of a tile each;
  - their last bid beside the count;
  - the Computer badge on the avatar's edge.

  The board takes the full width, and your own seat stays below it, slightly smaller (`tight`).

- **The top bar fits:**
  - the Bid badge is hidden, since each bid shows by the bidder's seat, and screen readers still hear every bid;
  - spacing is tighter;
  - Leave reads "Leave", or just its flag on screens 368 px wide or less, with the full name kept for screen readers.
- **Rounds so far:** the Round badge becomes a button that opens the rounds in a sheet, and the history is only read while the sheet is open.

Wider screens keep today's layout.

## Verification

- **Vitest:** red first for:
  - the opponents row (and its absence on wider screens);
  - the rounds sheet, and reading the history only when it opens;
  - the hidden strip bid;
  - the compact and tight seats.

  All web tests pass.

- **Rendered at 328×720, 360×740 and 390×844 with 2 and 4 players** (headless Chrome with phone emulation, on a temporary preview page that isn't committed):
  - no element runs off the screen;
  - no overlap in the top bar.
- **Known limit:** on a 328 px phone with 4 players, the board shrinks to about 60 px during your own turn, while the bid controls are open. It's full size on other turns.
