# ADR-2026-11-16: Unique nicknames

- **Status:** Proposed
- **Approved by:** (name, date; filled in by the maintainer)
- **Companion:** [ADR-2026-11-16-unique-nicknames-for-dummies.md](ADR-2026-11-16-unique-nicknames-for-dummies.md)

## Context

Players are named at the table by their nickname alone. PR 5B-1 removed the `#7BAC` address tag everywhere except the player's own header button, because it made toasts, bid chips and the rounds panel long. The tag was what told two players with the same nickname apart, so two players called "Maki" at one table now look the same apart from their faces. The maintainer asked for nicknames to be unique instead.

Nicknames live in `ChipFaucet` (1.1.0 on Sepolia, proxy `0xfdB7…A2DC`):

- `mapping(address player => string) nicknames` in the ERC-7201 storage struct.
- `_setNickname` checks `NicknameRules.isValid` (3 to 20 characters: letters, digits, single spaces, `_` and `-`; no leading or trailing space), stores the name and emits `NicknameSet`.
- It is reached from `claim`, `claimWithAvatar` and `setNickname`.

Nothing stops two players from setting the same nickname. Only the contract can enforce uniqueness: a check in the web app alone could be bypassed, and two players could pass it at the same moment.

## Options considered

### Option A: a check in the web app only

Before saving, the app reads every `NicknameSet` event and refuses a name already in use.

- **Gives:** no contract change.
- **Costs:** it isn't enforced, it races, and reading the whole event history grows slower and hits the RPC provider's block-range limits.

### Option B: the contract reserves each name (chosen)

`ChipFaucet` keeps an owner for each name and refuses a name someone else holds.

- **Gives:** real enforcement, and a single read for the app to check a name before sending.
- **Costs:** one new storage mapping, a new custom error, a new view, an upgrade on Sepolia, and a one-off step to reserve the names players already have.

### Option C: keep the tag and shorten it elsewhere

- **Gives:** no contract change.
- **Costs:** this is the behaviour the maintainer has just asked to remove.

## Decision

Option B.

**Contract (`ChipFaucet` 1.2.0):**

- Append `mapping(bytes32 nameKey => address owner) nicknameOwners;` to the end of `ChipFaucetStorage`. Appending to an ERC-7201 struct keeps the layout safe; `validate-layout` and the upgrade task check it.
- The name key is `keccak256` of the nickname in lower case. The rules only allow ASCII, so lowering letters is enough, and "Maki" and "maki" are the same name. Spaces, `_` and `-` still make names different ("Maki_1" is not "Maki 1").
- `_setNickname`:
  1. Validate the nickname as today.
  2. If the key's owner is set and is not `msg.sender`, revert `NicknameTaken()`.
  3. If the player had a different nickname, release its key.
  4. Reserve the new key for `msg.sender`, store the nickname, and emit `NicknameSet` as today.

  Setting your own nickname again, or changing only its letter case, still works.

- New view: `isNicknameTaken(string nickname, address asker) returns (bool)`. It is true when someone other than `asker` holds the name. The app calls it while the player types.
- New owner-only `reserveExistingNicknames(address[] players)`. It reserves each listed player's current nickname if nobody holds it yet, skips duplicates, and emits `NicknameReserved(player, nickname)` for each one reserved. It runs once after the upgrade, and the upgrade task prints any players skipped as duplicates.

**Web:**

- **While typing:** the welcome form and the change-nickname form check `isNicknameTaken` after the player stops typing for 400 ms. A taken name shows a toast, "That nickname is taken. Try another.", and keeps the save button off. This follows the rule that errors are toasts, never red text under the field.
- **If someone takes the name first:** the `NicknameTaken` revert is decoded through `RULE_BY_SELECTOR` into the same message, as a refused action.

**Duplicates that already exist:** the first holder found by the backfill keeps the name. Later holders keep their nickname as it is until they change it. They aren't forced to rename, and no one can take that name from the holder. On today's testnet the expected number is zero or a handful of test accounts; the upgrade task lists them.

## Diagram

```
 welcome / rename form ── typing (400 ms pause) ──► ChipFaucet.isNicknameTaken(name, me)
            │                                              │ true ─► toast "taken", save off
            ▼ save                                         │ false ─► save on
 claim / claimWithAvatar / setNickname
            │
            ▼
 _setNickname: isValid? ─ no ─► InvalidNickname
            │ yes
            key = keccak256(lowercase(name))
            nicknameOwners[key] set and ≠ sender? ─ yes ─► NicknameTaken
            │ no
            release old key ─► reserve key ─► store ─► NicknameSet

 after upgrade (once, owner): reserveExistingNicknames([...players from NicknameSet events])
```

## Consequences

- **Better:** every nickname is unique ignoring letter case, so plain names at the table are never ambiguous for new names.
- **Costs more:** a few thousand gas more per nickname change, for one storage read and up to two writes.
- **Upgrade:** `ChipFaucet` goes to 1.2.0 on Sepolia through the upgrade task, after explicit approval from the maintainer. Then the owner runs the one-off reservation. The faucet's storage only grows; nothing is migrated or removed.
- **Existing duplicates** stay until their holders rename.
- **Interface:** `NicknameTaken`, `NicknameReserved`, `isNicknameTaken` and `reserveExistingNicknames` are added to `IChipFaucet`. The ABI export is regenerated.
- **Packages:** none added or removed.
- **Confidentiality:** not affected. Nicknames are already public.

## Verification

- **Hardhat tests:**
  - a taken name reverts `NicknameTaken`, ignoring letter case;
  - the same player can set the same name again or change its case;
  - renaming frees the old name for someone else;
  - `isNicknameTaken` true and false cases;
  - the backfill reserves names, skips duplicates, emits `NicknameReserved`, and is owner-only;
  - all three entry points enforce the rule.
- **Upgrade checks:** `validate-layout` and the upgrade-safety CI job pass.
- **Vitest:** the form check (taken, free, check failed), the toast, and the decoded revert.
- **Sepolia, after the approved upgrade:** with the two test accounts, the second account can't take the first one's nickname in any letter case, and a renamed account's old name becomes free.
