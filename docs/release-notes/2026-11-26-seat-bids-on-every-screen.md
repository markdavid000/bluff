---
date: 2026-11-26
branch: fix/desktop-seat-bids
base: dev
scenario-impact: none
---

# Every player's bid shows beside them, on every account

This fixes two problems the maintainer found while playing on a laptop with three accounts.

- **Missing bids:** another player's bid beside their picture came only from live bid events this browser had seen. If the page opened after they bid, or a lagging node missed the event, their bid never appeared, though the rounds panel listed it.
  - **Fix:** the game hook now reads the round history while a game is being played, and fills each seat's bid from the current round, with live events still taking priority.
  - **Also:** the rounds panel and the phone sheet use that same history, so the game screen no longer makes its own read. The read now runs on phones too, every 10 seconds and on each new bid; the seats need it.
- **Cut-off bid:** the bid of the player on the right side was cut off by the edge of the game area. Who sits on the right depends on the account, which is why it looked account-specific.
  - **Fix:** that player's bid now sits on the board side of their picture.

**No contract change, no new package.**

## Verification

- **Vitest:** red first for:
  - bids from before the page opened;
  - earlier rounds being ignored, and a live bid replacing the chain's;
  - the right-hand seat's bid side.
- **Rendered with 2, 3 and 4 players** at 1024×768, 1280×800, 1440×900 and 1920×1080, on a temporary preview page that isn't committed: every bid is fully visible on screen.
