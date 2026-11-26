---
date: 2026-11-26
branch: fix/cash-out-amount
base: dev
scenario-impact: none
---

# One cash out at a time

Implements [ADR-2026-11-26-one-cash-out-at-a-time](../adr/ADR-2026-11-26-one-cash-out-at-a-time.md) (Option A, approved by the maintainer on 2026-11-26).

**Before:** if an earlier cash out was left half done, starting a new one quietly finished the old one, ignored the amount just typed, and said "Chips cashed out".

**Now:**

- **No silent swap:** a new cash out stops before sending anything, with the toast "Finish your last cash out first. Then you can cash out more."
- **After any failed cash out,** the app checks again for an unfinished one, so the panel's Finish button appears without a reload.
- **The dialog closes itself** when an unfinished cash out turns up. The panel shows Finish with the line "Finish your last cash out before you cash out more.", and Cash out stays disabled until it's finished.
- **Finish works as before:** it pays out the earlier request.

**No contract change, no new package.** A test that described the old silent finish was replaced, because the behaviour it described was removed.

## Verification

- **Vitest, red first:**
  - a cash out with an open request sends nothing and shows the toast;
  - a failed cash out triggers a fresh check;
  - Finish completes the open request;
  - the panel shows the line;
  - the dialog closes once a request is found.
- **Still to do by hand on Sepolia** (from the ADR):
  1. Start a cash out and close the tab after the first step.
  2. Reopen the app. Only Finish is offered, with the line.
  3. Finish it, then cash out again.
