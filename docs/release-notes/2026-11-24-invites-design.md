---
date: 2026-11-24
branch: chore/invites-design
base: dev
scenario-impact: none
---

# Two invite messages, and the design sample page removed

From the PR 7 audit. **No contract change, no new package.**

## Changes

- **Two invite errors now have plain sentences.** `BluffInvites` can refuse a join with `AlreadyInvited` or `NoAttempt`, for example when two tabs try the same invite code at once. Players used to see the general "something went wrong" message; now they read:
  - "You're already let in to this table. Try joining again."
  - "That invite check has already finished. Try joining again."
- **The `/design` sample page is gone.** It was the design pass's showcase, and the architecture document said it would be removed once real screens used its pieces, which they now all do. Removed with it:
  - the `(prototype)` route and the `design` feature;
  - `BoardPreview` and `usePreviewBoard` in the table feature, which only it used;
  - its entries in the smoke test, the route test, the button-icon test's exemptions and the architecture document.

## Verification

- **Vitest:** the test listing every error a player can trigger was red first with both names added, and is green with the sentences. All web tests pass.
- **`pnpm knip`** is clean, so nothing is left that only the page used.
- **`pnpm preflight`** passed, and `/design` now answers 404.
