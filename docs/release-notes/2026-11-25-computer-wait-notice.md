---
date: 2026-11-25
branch: feat/computer-wait-notice
base: dev
scenario-impact: none
---

# The computer says how long it waits, and can be called back

Builds the approved [ADR-2026-11-25-computer-wait-notice](../adr/ADR-2026-11-25-computer-wait-notice.md). **No contract change, no new package, no change to how the computer behaves.**

## Changes

- **`COMPUTER_WAIT_MS`** (5 minutes) moves to `@bluff/game`. The computer service uses it in place of its own `PARKING_LIMIT_MS`, with the same value and the same rule, and the web reads the same number for its wording.
- **While a computer sits at a table that hasn't started,** the waiting room says: "Baba Dice waits about 5 minutes for the game to start."
- **When a computer leaves a waiting table,** the notice says "Baba Dice left because the game didn't start", in place of "Baba Dice left the table". People leaving and the game in play keep their messages.
- **Call the computer back** appears in the empty seat and beside Copy invite link once a computer has left, while the table still waits and has a free seat. It asks the computer service again for this table, through the same arrival flow as Play the computer ("The computer is joining…"), and hides while a computer is on its way.
- **The "a computer left" memory** lasts for the current visit to the table page, as the ADR says.

## Verification

- **Tests, red first (12 failing), green after:**
  - the shared constant;
  - the notice for a computer, but not for a person;
  - the event hook passing "still waiting";
  - the wait line shown and hidden;
  - the computer leaving and being called back to this table;
  - no offer at a table a computer never sat at, or once the seat is taken;
  - the buttons on screen, and their absence while the computer is coming.
- **`pnpm preflight`.**
- **Live:** see the pull request.
