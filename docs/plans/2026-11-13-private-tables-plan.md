# Private tables and random table numbers: plan

Built on [ADR-2026-11-13-private-tables-and-table-ids](../adr/ADR-2026-11-13-private-tables-and-table-ids.md) (approved). This is two pull requests, contracts first, because the web app reads the deployed addresses and ABIs.

## What players get

- **Table links can't be guessed.** New tables get random numbers of up to 15 digits, like `/table/482915736201844`.
- **Private tables need the invite link.**
  - **Hosts:** create a private table as before. **Copy invite link** copies `/table/<number>#<code>`, and it still works after a reload.
  - **Players already at the table** can copy the same link.
  - **Someone opening the link** presses **Join**. The button reads "Checking your invite…" for about 20 to 30 seconds, then "Taking your seat…".
  - **Someone with only the number** sees "This table is private. Ask the host for the invite link." and no Join button.
  - **A wrong or broken code** gets a toast: "That invite link doesn't work. Ask the host for a new one."
  - **After 3 wrong tries** at one table: "That's too many tries. Ask the host for a new link."
- **Public tables** behave exactly as today.

## PR A: contracts (`feat/private-tables-contracts`)

### `BluffInvites` 1.0.0 (new)

- **Setup:** UUPS, `Ownable2StepUpgradeable`, `PausableUpgradeable`, ERC-7201 storage (`bluff.storage.BluffInvites`). `initialize(owner, bluff)`.
- **Storage:**
  - `IBluff bluff`;
  - `mapping(id => euint64) codes`;
  - `mapping(id => mapping(player => ebool)) attempts`;
  - `mapping(id => mapping(player => uint8)) tries`;
  - `mapping(id => mapping(player => bool)) invited`.

| Function                                          | Who                       | Notes                                                                                                                                                                                                                                                                            |
| ------------------------------------------------- | ------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newCode(id, host)`                               | `Bluff` only (`NotBluff`) | `FHE.randEuint64()`, `allowThis`, `allow(host)`; marks the host invited. Emits `CodeCreated(id)`.                                                                                                                                                                                |
| `tryCode(id, externalEuint64 guess, bytes proof)` | anyone, when not paused   | <ul><li>Refusals: `NoCode(id)` when the table has no code, `AlreadyInvited(id)`, and `TooManyTries(id)` after 3.</li><li>Steps: `fromExternal`, then `eq`, `allowThis` and `makePubliclyDecryptable`.</li><li>Emits `CodeTried(id, player, tries)`.</li></ul>                    |
| `confirmCode(id, player, clearValues, proof)`     | anyone                    | <ul><li>`NoAttempt(id, player)` if no attempt is waiting.</li><li>`FHE.checkSignatures([attempt], ...)` verifies the reveal, then the attempt is deleted.</li><li>True: `invited = true`, `allow(code, player)`, emits `Invited`.</li><li>False: emits `CodeRejected`.</li></ul> |
| `isInvited(id, player)`                           | view                      | Read by `Bluff`.                                                                                                                                                                                                                                                                 |
| `codeOf(id)`                                      | view                      | The handle, for user decryption.                                                                                                                                                                                                                                                 |
| `attemptOf(id, player)`                           | view                      | The handle, for the public reveal.                                                                                                                                                                                                                                               |
| `triesOf(id, player)`                             | view                      | —                                                                                                                                                                                                                                                                                |
| `pause`, `unpause`, `version`                     | owner / pure              | —                                                                                                                                                                                                                                                                                |

Notes:

- **Every refusal** is a custom error, and **every state change** emits an event.
- **Gas cost** per call: `tryCode` is one `fromExternal`, one `eq` on `euint64` and one `makePubliclyDecryptable`; `newCode` is one `randEuint64`. The measured HCU goes in the PR.

### `Bluff` 1.2.0

- **Storage:** `IBluffInvites invites` is appended at the end of `BluffStorage`.
  - It's set once by the owner through `setInvites(address)`, which emits `InvitesSet` and reverts `InvitesAlreadySet` or `ZeroAddress`.
- **Creating:** `_createTable` sets `id = uint48(keccak256(prevrandao, host, ++nextTableId))`.
  - It loops while the id is 0 or already taken.
  - For a private table it calls `$.invites.newCode(id, host)`.
- **Joining:** `_requireJoinable` checks `table.isPrivate && !$.invites.isInvited(id, player)`, which reverts with `NotInvited(id)`.
- **Version:** `version()` becomes `"1.2.0"`.
- **`IBluff` and `IBluffInvites`** get the new errors, events and functions.

### Size

- **`limits.test.ts`:**
  - `BLUFF_HEADROOM` becomes the measured headroom rounded down to 128 bytes;
  - a size check for `BluffInvites` is added.
- **The PR** states `Bluff`'s new size and the bytes left.

### Deployment

- **`tasks/deployments.ts`:** `BluffInvites` is added to `DeploymentRecord.contracts` and `PROXY_NAMES`.
- **`deploy`:**
  - a fresh network deploys all four and links them;
  - a new `deploy-invites` task deploys only `BluffInvites`, for Sepolia, and records it.
- **`validate-layout`, `verify` and `upgrade`** accept `BluffInvites`.
- **Sepolia order**, so no private table is ever created without a code holder:
  1. `deploy-invites`;
  2. `upgrade --contract Bluff`;
  3. `setInvites` straight after.
- **`exports/index.ts`:** `bluffInvitesAbi` and `invites` in `BluffDeployment`, and `export-abis.mjs` includes it.

### Tests (Hardhat)

- **`invites.test.ts`** (new):
  - **Codes:** `newCode` only from `Bluff`; the host can decrypt the code; **a stranger, a player who failed, and the other seated players before they prove it cannot** (the confidentiality test).
  - **Right code:** `tryCode` then `confirmCode` invites the player, who can then decrypt the code.
  - **Wrong code:** the player is not invited, and the attempt is cleared.
  - **Replays:** a replayed false proof reverts with `NoAttempt`; a forged or mismatched proof is refused by `checkSignatures`.
  - **Refusals:** `TooManyTries` on the 4th, `AlreadyInvited`, `NoCode` for public and unknown tables, and pausing.
  - **Events:** each one.
- **`tables.test.ts` and `callback.test.ts`:**
  - a private table refuses a stranger, free and paid, with the payer's chips untouched;
  - an invited player joins both;
  - a public table is unchanged;
  - ids are random, nonzero and never reuse an existing table's id.
- **`admin.test.ts`:** `setInvites` (owner only, once, not zero).
- **`upgrade.test.ts`:** 1.1.0 → 1.2.0 keeps tables, seats and ready marks, and the `BluffInvites` upgrade works.
- **Sepolia scenario (`test/sepolia/full-game.ts`):** a private free table where a third account with only the number is refused, and an invited account joins.
- **Coverage:** stays at or above 95% of lines and 90% of branches.
- **Slither:** clean.

### Docs

- `docs/contracts.md`: the new contract, functions, events, errors, views and sizes.
- `docs/architecture.md`: the contracts list.
- Release note `docs/release-notes/<date>-private-tables-contracts.md`, with the Sepolia addresses after the upgrade.

## PR B: web app (`feat/private-tables-web`)

| Piece                    | Where                                       | What it does                                                                                                                                                                                                                                                                                               |
| ------------------------ | ------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contracts.invites`      | `config/chain.ts` (from `@bluff/contracts`) | The new address.                                                                                                                                                                                                                                                                                           |
| `HIDDEN_VALUE_CONTRACTS` | `hooks/use-permit.ts`                       | Adds `contracts.invites`, so the permit covers it. Existing permits are granted again once: automatically for embedded wallets, one tap for a player's own wallet.                                                                                                                                         |
| `table-links`            | `lib/`                                      | <ul><li>`inviteLink(origin, id, code?)` adds `#<code>`, with the code in base 36 (up to 13 characters).</li><li>`parseInvite(text)` returns `{ id, code }`, reading the number, path and fragment. Ids accept up to 15 digits.</li><li>`readInviteCode(hash)` reads the code for the table page.</li></ul> |
| `useInviteCode(id)`      | `features/table/hooks`                      | <ul><li>For the host and invited players, reads `codeOf(id)` and decrypts it with `useDecryptValues`.</li><li>Returns loading, failed with retry, or the code.</li><li>Waiting-room **Copy invite** uses it, and is held with "Getting your invite…" while it loads.</li></ul>                             |
| `useProveInvite()`       | `hooks/`                                    | `tryCode` → public reveal (`useDecryptPublicValues`, retried for up to 30 s) → `confirmCode`. Each step re-reads `isInvited`, `attemptOf` and `triesOf` first, so a reload resumes. It throws typed errors for a wrong code and for too many tries.                                                        |
| `useWaitingRoom` join    | `features/table/hooks`                      | <ul><li>A private table runs `useProveInvite` before `takeSeat`, inside one `useAction`. The labels are "Checking your invite…", then the usual seat labels.</li><li>`joinProblem` gains `private` (no code in the link) and `tooManyTries`.</li></ul>                                                     |
| `VisitorView`            | `features/table/components`                 | Private with no code: the private message and Back to the lobby, with no Join button.                                                                                                                                                                                                                      |
| `useJoinLink`            | `features/lobby/hooks`                      | Keeps the fragment when moving to the table.                                                                                                                                                                                                                                                               |
| `pickTableToJoin`        | `features/lobby/hooks/use-sit-down.ts`      | Ties broken by `createdAt`, not id. `LobbyTable` gains `createdAt`.                                                                                                                                                                                                                                        |
| Copy                     | `features/table/copy.ts`                    | `checkingInvite`, `privateTable`, `inviteNotWorking`, `tooManyTries`, `gettingInvite`.                                                                                                                                                                                                                     |

### Tests (Vitest)

- **`table-links`:** links with and without a code, fragments in the paste box and on the page, 15-digit ids, and bad codes.
- **`useInviteCode`:**
  - loading, failed with retry, and ready;
  - the host and invited players only;
  - nothing is decrypted for a visitor.
- **`useProveInvite`:**
  - the happy path;
  - resuming from an attempt already made, and from an invitation already confirmed;
  - a wrong code, too many tries, and the reveal retry.
- **`useWaitingRoom`:** private join order (prove, then seat), the new join problems, and copy invite waiting for the code.
- **`TableScreen`:** a private visitor with no code, with a code, a wrong code, and too many tries.
- **Lobby:** the paste box keeps the fragment, and "Play now" picks by `createdAt`.

### Verify

`pnpm preflight`, then two accounts on Sepolia (Google and an own wallet):

1. A private free table and a private paid table: create, copy the invite, join, ready, start.
2. A third account opens `/table/<number>` without the code and is turned away.
3. A wrong code shows the toast.
4. The host reloads and copies the invite again.
5. A public table still works.

## Screen sketch (visitor, private, no code)

```
 ┌──────────────────────────────────────────┐
 │              Table 482915736201844        │
 │            (😀)(👳)  2 of 4 players        │
 │                    Free                    │
 │  This table is private. Ask the host for   │
 │  the invite link.                          │
 │              [ ← Back to the lobby ]       │
 └──────────────────────────────────────────┘
```

## Removed

- The id-order tie-break in `pickTableToJoin`.
- `TABLE_NUMBER` and `TABLE_PATH`'s 18-digit limit, replaced by the 15-digit rule.
- Nothing else is replaced. Public tables, the payment check and the cashier are untouched.
