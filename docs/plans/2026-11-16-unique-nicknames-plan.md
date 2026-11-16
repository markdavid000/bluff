# Plan: unique nicknames

Builds [ADR-2026-11-16-unique-nicknames](../adr/ADR-2026-11-16-unique-nicknames.md), approved by the maintainer on 2026-11-16.

## Files

| Area     | Files                                                                                                                                         |
| -------- | --------------------------------------------------------------------------------------------------------------------------------------------- |
| Contract | `ChipFaucet.sol` (1.2.0), `interfaces/IChipFaucet.sol`, `libraries/NicknameRules.sol` (`keyOf`)                                               |
| Task     | `tasks/nicknames.ts` (`reserve-nicknames`), `hardhat.config.ts`                                                                               |
| Web      | `features/account/hooks/use-nickname-taken.ts` (new), `use-welcome.ts`, `features/account/copy.ts`, `lib/copy.ts`                             |
| Tests    | `test/unit/nicknames.test.ts`, `test/helpers/nicknames.ts`, `test/unit/tasks.test.ts`, version tests, `use-welcome.test.ts`, `errors.test.ts` |
| Docs     | `docs/contracts.md`, this plan, a release note                                                                                                |

## Interfaces

- `error NicknameTaken()`, `event NicknameReserved(address indexed player, string nickname)`.
- `isNicknameTaken(string nickname, address asker) view returns (bool)`.
- `reserveExistingNicknames(address[] players)`, owner only.

## Wording

- "That nickname is taken. Try another.": as a toast when the check finds the name taken, on Save while it is taken, and when the contract refuses it.

## Tests

- Hardhat: taken in any letter case on all three entry points; same player again or with a new case; renaming frees the old name; a skipped duplicate renaming doesn't free the first holder's name; the view; the backfill reserving, skipping duplicates and empty names, idempotent and owner-only; the task finding players from events and naming duplicates.
- Vitest: the check waits for typing to pause, skips invalid names, turns Save off and toasts once for a taken name, and clears for a free one; the decoded revert.

## Rollout

1. Merge.
2. With the maintainer's approval: `upgrade:sepolia --contract ChipFaucet`.
3. Then `reserve-nicknames --network sepolia`.
4. Commit the updated deployment records and the list of duplicates in a follow-up.

Until the upgrade, the app's check on Sepolia gets a failed read and lets Save through, and the old contract accepts any name as before.

## Removed

Nothing.
