# Plan: everyone readies again when a paid table reopens

Builds [ADR-2026-11-17-ready-again-after-reopen](../adr/ADR-2026-11-17-ready-again-after-reopen.md) once both ADR files are approved.

## Files

- **Contract:**
  - `packages/contracts/contracts/Bluff.sol`: `_reopen` deletes each remaining seat's mark; `version()` returns 1.4.0.
  - `packages/contracts/test/unit/limits.test.ts`: `BLUFF_HEADROOM` goes from 896 to 768.
  - `test/unit/ready.test.ts` (or the existing ready tests): the reopen cases, written first.
  - `admin.test.ts` and `tasks.test.ts`: the version pins.
- **Web:**
  - `apps/web/src/features/table/copy.ts`: `openAgain` becomes "The table is open again. Press Ready to play."
  - Its notice test.
- **Docs:**
  - `docs/contracts.md`: `TableReopened` clears ready marks.
  - The release note.

## Order

1. Write the Hardhat tests and see them fail.
2. Make the contract change, lower the rule, and update the version pins.
3. Run the whole contract suite, `validate-layout:sepolia`, then `pnpm preflight`.
4. Open the PR.
5. After it merges, run the Sepolia upgrade only when the maintainer says yes, record it, and check it live with two accounts.

## Removed

Nothing.
