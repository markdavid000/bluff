---
date: 2026-11-13
branch: feat/private-tables-contracts
base: dev
scenario-impact: needs_automation
---

# Private tables need the invite code, and table numbers are random

Tables now get random numbers instead of counting up, so links can't be guessed. A private table gets a secret invite code, kept encrypted with Zama's FHE, and only players who prove they hold it can sit down. Anyone reading the chain still can't join without it. The web app catches up in the next pull request. Until then, private tables can't be joined through the app.

## Changes

- **`BluffInvites` 1.0.0 (new)** ([ADR-2026-11-13-private-tables-and-table-ids](../adr/ADR-2026-11-13-private-tables-and-table-ids.md)):
  - `newCode`: only `Bluff` can call it. It makes each private table's code with `FHE.randEuint64()`. Only the host can read it, and the host is counted as invited. It still works while paused, so tables can always be made.
  - `tryCode`: compares an encrypted guess with the code using `FHE.eq` and makes only the true-or-false answer publicly decryptable. A player gets 3 tries per table, and a new try replaces the last.
  - `confirmCode`: checks that answer with `FHE.checkSignatures` and clears the attempt, so the same answer can't be sent twice. A true answer invites the player and lets them read the code, so they can invite others.
  - Views: `isInvited`, `codeOf`, `attemptOf`, `triesOf`, `bluff`, `version`, `MAX_TRIES`.
- **`Bluff` 1.2.0:**
  - **Random table numbers.** Each id is `uint48(keccak256(prevrandao, host, ++nextTableId))`. It's never 0, and it skips an id already in use. `nextTableId` keeps its slot and becomes the counter.
  - **Private tables.**
    - Creating one, free or paid, calls `BluffInvites.newCode` in the same transaction.
    - Joining one, free or paid, reverts with `NotInvited(id)` unless the player is invited.
  - **Linking.** `setInvites(address)` links the invites contract once, only by the owner (`InvitesSet`, `InvitesAlreadySet`). `invites()` reads the link.
  - `IBluffInvites invites` is appended to the end of `BluffStorage` (ERC-7201 safe).
- **Size.** `Bluff` grew by 686 bytes to 23,632, leaving 944 under the 24,576-byte limit. As the maintainer chose in the ADR, the size test's required headroom drops from 1,536 to 896 bytes. `BluffInvites` is 8,799 bytes.
- **Tasks:**
  - **New tasks:** `deploy-invites` (refuses if one is already recorded) and `link-invites` (reads the link back to confirm), with `deploy-invites:sepolia` and `link-invites:sepolia` scripts.
  - **`deploy`:** a fresh network now gets all four contracts, linked.
  - **`upgrade` and `validate-layout`** know `BluffInvites`. A missing record entry gives a clear message.
  - **`deployProxy`** moved to `tasks/chain.ts`, so the deploy and invites tasks share it.
- **Exports:** `bluffInvitesAbi`, and `invites` in `BluffDeployment`.
- **Docs:** the contract reference (new section, encrypted values, sizes, owner powers, Sepolia addresses) and the architecture doc. The architecture doc's "2 KB of room" was already out of date; it now says 896 bytes.

## Removed

- **Tables numbered from 1.**
- **The test "numbers tables from 1".** Its purpose no longer holds. Its replacement checks that ids are random, nonzero, unique and below 2^48, that they can be predicted exactly from their inputs, and that an id already in use is skipped.

## Verification

- **Hardhat:** 236 passing, up from 199. 2 skipped tests are unchanged.
  - **`invites.test.ts` (23):**
    - **Who can read the code:** the host can, and a stranger, the owner, `Bluff` and a player who failed can't. It can never be publicly decrypted.
    - **Trying codes:**
      - the right code invites the player, who can then read it;
      - a wrong code doesn't, and only true or false is ever revealed;
      - the 3-try limit, kept separately for each table and player;
      - the `AlreadyInvited` and `NoCode` refusals.
    - **Refused answers:** a replayed answer (`NoAttempt`), another player's answer, a made-up one, and one from a replaced try (all `KMSInvalidSigner`), and a code encrypted by someone else (`InvalidSigner`).
    - **Pausing and upgrades.**
  - **`private-tables.test.ts` (14):**
    - **Table numbers:** random, nonzero and unique; predicted exactly from the block's randomness; an id already in use is skipped (forced by writing a table into that id's storage first).
    - **Linking:** `setInvites`'s rules, and that a private table can't be made before the link.
    - **Private tables, free and paid:** each makes a code; a stranger is refused, a paying stranger with their chips untouched; an invited player sits down, and can leave and come back; public tables are unchanged.
  - **`tasks.test.ts`:** the Sepolia path, run against a `Bluff` with no invites contract: `deploy-invites`, then `link-invites`, each refusing to run twice.
  - **Existing tests:** about 65 hard-coded table numbers now use the real id. A shared helper fixes the next block's randomness, so assertions on the creating transaction's own events stay exact. No assertion was loosened. Tests that join a private table now prove the code first.
- **Mutation checks:**
  - **`BluffInvites`:** each of 8 safety lines was removed in turn, and a test failed every time (the invited player's read access, the already-invited check, using the answer, the proof check, the host's read access, clearing the attempt, the try limit, the no-code check).
  - **`Bluff`:** the same for 4 lines (the invite check, making the code, the clash check, the block's randomness).
- **Coverage:** 100% of lines, 96.05% of branches.
- **Lint:** solhint clean.
- **Slither:** runs in CI, since it isn't installed locally.
- **Preflight:** `pnpm preflight --fast` passed.
- **Sepolia:**
  - **Before upgrading:** confirmed the deployer `0xA020…3E6b` owns every proxy, and that all three new layouts are safe upgrades of the live implementations.
  - **The upgrade:**
    1. `BluffInvites` deployed: proxy `0x5bACDa7BACa6f67754122F49b59B404471C3F140`, implementation `0x4642baD2100Af550Eb79395f6b088fE3c07c78E2`, verified on Etherscan.
    2. `Bluff` 1.1.0 → 1.2.0 at implementation `0xCbC9448B8eC8F5c00216c4686628CBf0bf232b32`, verified on Etherscan. The proxy is unchanged.
    3. Linked straight after.
    4. **Re-upgraded `BluffInvites`.** Slither in CI flagged one medium finding: `confirmCode` ignored the handle returned by `FHE.allow`. The fix stores the returned handle, as every other access grant in our contracts does, so behaviour is unchanged. The proxy was then upgraded, with the maintainer's approval, to implementation `0x7a9637Be08c5E8002B38db785F3F4DE0F809975B`, verified on Etherscan, so the live code matches this branch. It stays at 1.0.0 because the first build was never released. The live private-table game passed again against it.
  - **Read back:** versions, owners, the links both ways, unpaused, and an old table still readable. `validate-layout:sepolia` passes for all four contracts.
  - **Live scenario (`test:sepolia`):** 3 passing, 6 minutes in all.
    - **Free and paid games** played as before.
    - **The new private-table game:**
      - the guest was refused with only the table number (`NotInvited`);
      - a wrong code was turned away and the guest wasn't invited;
      - the right code invited them, and they sat down and left.
    - **Timings:** creating a private table took 11 s and the host read the code in 5 s. Each try took 13 to 16 s, its public reveal 3 to 4 s and its confirm 8 s, so proving a code takes about 25 to 28 s, plus 12 s to sit down.
