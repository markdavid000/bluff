---
date: 2026-11-16
branch: feat/unique-nicknames
base: dev
scenario-impact: needs_automation
---

# Every nickname belongs to one player

Nicknames are now unique, ignoring letter case, so "Maki" and "maki" can't both exist. While a player types a name on the welcome screen, the app checks it and says "That nickname is taken. Try another." if someone already has it. Changing your nickname frees the old one.

## Changes

- `ChipFaucet` 1.2.0 reserves each nickname for its holder. `setNickname`, `claim` and `claimWithAvatar` revert `NicknameTaken` for a name someone else holds.
- New view `isNicknameTaken`, and an owner-only `reserveExistingNicknames` for names set before this version.
- New task `reserve-nicknames`: it finds every player with a nickname from `NicknameSet` events, reserves their names (first holder first) and lists any duplicates.
- The welcome screen checks a valid name 400 ms after the player stops typing. A taken name shows the toast and turns Save off. The contract's `NicknameTaken` is explained with the same words.

## Removed

- Nothing.

## Verification

- Hardhat: 11 nickname tests and a task test. All contract tests pass, and `validate-layout:sepolia` says the source is a safe upgrade of the live `ChipFaucet`.
- Vitest: the welcome screen's taken-name check and the decoded error.
- Not yet live: the Sepolia upgrade and the reservation run wait for the maintainer's approval. After them, check with the two test accounts that the second can't take the first's name in any letter case, and that a renamed account's old name becomes free.
