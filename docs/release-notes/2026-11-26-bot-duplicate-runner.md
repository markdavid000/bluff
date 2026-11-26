---
date: 2026-11-26
branch: fix/bot-duplicate-runner
base: dev
scenario-impact: none
---

# The computer plays each table once, and says "busy" instead of failing

Two computer-service bugs from the 2026-11-26 bug hunt.

- **Two loops on one seat:** when a join's confirmation failed but the chain showed the computer seated, the service started a runner without checking whether one was already playing that table, so two loops could drive the same seat.
  - **Fix:** a new `runners.ts` registry owns the runner map that lived in `main.ts`, and starts at most one runner per table. A second start is skipped with an "already playing" warning.
- **A 5xx for a computer that did sit down:** when the computer turned out to be seated at a different table, the service started playing that table, then rethrew the join error. The caller got a 503, and the browser said the computer was "unavailable".
  - **Fix:** it now answers `refused` / `all-busy`, which the web shows as the computer being busy. The computer that tried really is busy at another table, and the requested table didn't get one.

**No web, contract or package change.** The HTTP contract is unchanged; `all-busy` is an existing reason.

## Verification

- **Vitest:** red first for the registry and the busy answer.
  - The existing "seated somewhere else" test expected the throw. It now expects `all-busy`, and still checks that the computer isn't freed and that its runner starts at the other table.
- **All 163 bot tests pass.**
- **Not checked by hand:** the service isn't redeployed to Fly by this change.
