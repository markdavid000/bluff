---
date: 2026-11-26
branch: fix/stuck-loading
base: dev
scenario-impact: none
---

# No more screens stuck loading after a failed read

Found in the full check: two failed reads left the player looking at a skeleton or a disabled button, with no message and no way forward except reloading the page.

- **Unlocking hidden values:** if the check for the player's unlock (`useHasPermit`) failed, chips, your dice and the invite code stayed on "loading" for good.
  - **Fix:** `usePermit` now reports `failed` with a retry, and each of the three already shows its own "try again" in that state.
- **Welcome form:** if the read of when today's free chips can be claimed failed, Save stayed disabled with no explanation.
  - **Fix:** it now shows the toast "We could not check your free chips." with a Try again button that reads it again.

A player signed in with a different wallet than their own still sees "checking", as before. That's a separate case and isn't changed here.

**No contract change, no new package.**

## Verification

Vitest, red before green:

- the permit check fails, then recovers on retry;
- chips and dice show their try-again when the permit check failed;
- the welcome toast and its Try again.

All web tests pass.
