# ADR-2026-11-13: Private tables with an encrypted invite code, and random table numbers

- **Status:** Approved
- **Approved by:** MarkDavid, 13th Nov 2026. Size: lower the required headroom to the measured size, rounded down to 128 bytes (option 1).
- **Companion:** [ADR-2026-11-13-private-tables-and-table-ids-for-dummies.md](ADR-2026-11-13-private-tables-and-table-ids-for-dummies.md)
- **Amends:** [ADR-2026-11-11-chips-and-buy-ins](ADR-2026-11-11-chips-and-buy-ins.md) and [ADR-2026-11-12-waiting-room-and-ready](ADR-2026-11-12-waiting-room-and-ready.md), where a private table is described as "not listed in the lobby"

## Context

Two things came up in testing PR 4 (`/table/[id]`):

1. **Table numbers count up.** `_createTable` sets `id = ++$.nextTableId`, so links read `/table/30`, `/table/31`. The maintainer wants numbers nobody can predict.
2. **A private table is only unlisted.**
   - `isPrivate` only skips `_list`.
   - `_requireJoinable` doesn't look at it, so anyone who tries `/table/31`, or calls `joinFreeTable(31)` directly, can sit down.

Random numbers alone don't fix the second point. Everything on the chain is public:

- `TableCreated(id, host, ...)` announces every table;
- `getTable` reads any of them.

Anyone reading the chain can list every table, whatever its number. Keeping strangers out of a private table needs something only invited players hold.

The maintainer asked that the private-table check use the Zama Protocol, keeping the secret encrypted so only the right players can open it.

Facts that shape the design:

- **Encrypted inputs.**
  - `FHE.fromExternal` calls `Impl.verify`, which passes `msg.sender` to `verifyInput`. A proof is bound to the receiving contract and to the account calling it (`@fhevm/solidity` 0.11.1, `lib/Impl.sol`).
  - So a player can send an encrypted code directly to whichever contract checks it.
  - Paid joins arrive through the cashier's `onConfidentialTransferReceived`, where `msg.sender` is the chips token, so they can't carry the code themselves.
- **No branching on encrypted values** ([FHE rules](../engineering-standards.md#fhe-rules)).
  - `FHE.eq(code, guess)` gives an `ebool` the contract can't act on directly.
  - Acting on it needs the three-step public reveal, which is a few seconds and a second transaction.
- **Size.**
  - `Bluff` is 22,946 bytes against the 24,576-byte limit, leaving 1,630 bytes.
  - The size test requires 1,536 bytes of headroom, so `Bluff` can grow by about 94 bytes before that test fails.
  - Anything bigger than a few checks must live in another contract, or the headroom rule must be lowered again.
- **Sponsored gas.** Embedded wallets don't pay for their transactions, so a cheap action a stranger can repeat is a cost to the project.

## Options considered

### A. Random numbers only

Change `_createTable` to pick a random id. Links can't be guessed, but anyone reading the chain can still find and join a private table.

- **Cost:** small, a few dozen bytes in `Bluff`.
- **Gives:** what the URL looks like, and nothing more.
- **Verdict:** rejected on its own, but kept as part of the decision.

### B. A signing key in the link (no FHE)

- The host's app makes a key pair, keeps the private key in the link and stores the public address on the table.
- A joiner's app signs their own address with it, and `_requireJoinable` checks the signature with `ECDSA.recover`.

Assessment:

- **Speed:** instant, one transaction to join.
- **Size:** `ECDSA` plus a new argument on both join paths costs `Bluff` an estimated 800 to 1,200 bytes, well past the ~94-byte margin.
- **Paid joins:** they would need the signature in `JoinRequest`, whose fixed 160-byte encoding the cashier checks.
- **Zama:** it doesn't use the protocol.

### C. An encrypted invite code checked by a new `BluffInvites` contract (chosen)

A small UUPS contract beside `Bluff` and `BluffCashier`.

- **Code.** It holds a random `euint64` code per private table, made on the chain with `FHE.randEuint64()` when the table is created.
  - The host is allowed to decrypt it, so their app can rebuild the link at any time.
  - Each player who proves they hold it is allowed too, so they can invite others.
  - Nobody else can read it.
- **Proving the code takes three steps:**
  1. `tryCode`: the joiner sends their code encrypted, and the contract compares it with `FHE.eq`.
  2. The app fetches the public reveal of that one true-or-false answer.
  3. `confirmCode`: the contract verifies the reveal and records the player as invited.
- **`Bluff`** then refuses anyone not invited at a private table, with a single external view call in `_requireJoinable`.
- **Size and paths.** This keeps `Bluff` within its margin and works for free and paid joins alike, because the invitation is recorded before the join.

Assessment:

- **Joining** costs 3 transactions instead of 1 (prove, confirm, join), about 30 to 40 seconds. All are sponsored for embedded wallets. A player's own wallet is asked 3 times.
- **Security:**
  - strangers can't join even with full knowledge of the chain;
  - the code is never readable on the chain;
  - a guess proves only true or false;
  - the proof binding stops anyone replaying another player's attempt.

### D. Check the code at the start, alongside the payment check

Store each joiner's `FHE.eq` result and reveal it with the payment check when the host starts. Players with the wrong code are removed then.

This saves a transaction per joiner. But a stranger sits at the table, in view, until the start. Strangers could also fill every seat on purpose, and the host can't remove them. Rejected.

## Decision

Option C, plus random table numbers (part of Option A).

### `BluffInvites` (new, UUPS, `Ownable2Step`, `Pausable`, ERC-7201 storage)

| Function                                                       | Who                       | What it does                                                                                                                                                                                                                                                                                                                                   |
| -------------------------------------------------------------- | ------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newCode(id, host)`                                            | `Bluff` only              | `code = FHE.randEuint64()`, then `FHE.allowThis` and `FHE.allow(code, host)`. Marks the host invited. Emits `CodeCreated(id)`.                                                                                                                                                                                                                 |
| `tryCode(id, externalEuint64 guess, bytes proof)`              | anyone                    | `FHE.fromExternal`, `FHE.eq(code, guess)`, `FHE.allowThis`, `FHE.makePubliclyDecryptable`. Stored per `(id, player)`, so a new try replaces the last. Limited to 3 tries per player per table (`TooManyTries`), so a stranger can't run up sponsored gas. Reverts `NoCode` for a public table or an unknown id. Emits `CodeTried(id, player)`. |
| `confirmCode(id, player, clearValues, proof)`                  | anyone (the joiner's app) | `FHE.checkSignatures([attempt], clearValues, proof)`.<br>• If true, records `invited[id][player]`, calls `FHE.allow(code, player)` and emits `Invited(id, player)`.<br>• If false, emits `CodeRejected(id, player)` and clears the attempt, so the same false proof can't be sent twice.<br>• Confirming again after success changes nothing.  |
| `isInvited(id, player)`, `codeOf(id)`, `attemptOf(id, player)` | views                     | For `Bluff`, the web app and reveals.                                                                                                                                                                                                                                                                                                          |

### `Bluff` 1.2.0

- **Storage.** `IBluffInvites invites` is appended to the end of `BluffStorage` (ERC-7201 safe), with an owner-only, set-once `setInvites` and `InvitesSet` event (the same pattern as `setCashier`).
- **Creating a table.** `_createTable` calls `$.invites.newCode(id, host)` when `isPrivate`, so the host still creates in one transaction, free or paid.
- **Joining.** `_requireJoinable` reverts `NotInvited(id)` when `table.isPrivate && !$.invites.isInvited(id, player)`.
- **Random ids.** `_createTable` sets `id = uint48(uint256(keccak256(abi.encode(block.prevrandao, host, ++$.nextTableId))))`.
  - It repeats with the next nonce on the rare clash with an existing table or 0.
  - `nextTableId` keeps its name and slot and becomes the nonce.
  - Ids are 15 digits or fewer, safe in a URL and in `bigint`.
  - Validators could predict an id, but ids aren't secrets: the invite code is the protection.
- **Size: this needs the maintainer's decision.**
  - The changes above add an estimated 400 to 700 bytes to `Bluff`. Only about 94 bytes fit before the size test's 1,536-byte headroom rule fails.
  - `Bluff` would still be under the network's 24,576-byte limit, with roughly 900 to 1,200 bytes to spare.
  - Two ways through, and approving this ADR means choosing one:
    1. **Lower the required headroom** to whatever the build measures, rounded down to the nearest 128 bytes. This is the recommendation: it keeps the change small and one more future feature can still fit.
    2. **Move code out of `Bluff` first**, in its own reviewed change. For example, `openTables`, `getTable` and `revealHandles` could move to a separate read-only contract. This is a larger refactor that touches every web read, so it would delay this work.
  - Whichever is chosen, the PR reports the measured size and the bytes left.

### Web app

- **Invite links** for private tables become `/table/<id>#<code>`.
  - The code sits in the URL fragment, which browsers never send to a server, so it stays out of hosting logs.
  - Public tables keep `/table/<id>`.
- **Host:** after creating a private table, the app decrypts the code through the existing permit, which now also covers `BluffInvites`, and builds the link. Copy invite works after a reload too.
- **Invited players** can decrypt the code the same way and copy the invite too.
- **Joiner:** **Join** runs prove, reveal, confirm and join as one action through `useAction`.
  - The progress reads "Checking your invite…" and then "Taking your seat…".
  - Each step re-reads the chain first, so a reload in the middle resumes rather than repeats.
- **Without a code**, a private table shows "This table is private. Ask the host for the invite link."
- **A wrong code** shows a toast: "That invite link doesn't work. Ask the host for a new one."
- **The lobby** sorts "Play now" ties by `createdAt` instead of id, since ids no longer count up.

### Not changing

- Public tables, the waiting room, ready marks and the payment check.
- `JoinRequest` and the cashier.
- Tables made before the upgrade keep their numbers. Existing private tables have no code, so nobody new can join them. They close by the existing 10-minute rule.

## Diagram

```
 HOST                                  BLUFF                       BLUFF INVITES
  │ createFreeTable / pay-and-create ──►│ _createTable
  │                                     │  id = random
  │                                     │  isPrivate ──────────────►│ newCode(id, host)
  │                                     │                           │  code = randEuint64
  │                                     │                           │  allow(code, host)
  │◄── user-decrypts code (permit) ─────┼───────────────────────────│
  │  link: /table/<id>#<code>           │                           │
  │                                     │                           │
 JOINER (opens the link)                │                           │
  │ 1 tryCode(id, enc(code), proof) ────┼──────────────────────────►│ eq(code, guess) → ebool
  │                                     │                           │ makePubliclyDecryptable
  │ 2 public reveal (relayer) ◄─────────┼───────────────────────────│
  │ 3 confirmCode(id, me, clear, proof)─┼──────────────────────────►│ checkSignatures
  │                                     │                           │ true → invited, allow(code, me)
  │ 4 joinFreeTable / pay-and-join ────►│ _requireJoinable          │
  │                                     │  isPrivate → isInvited? ─►│ (view)
  │                                     │  seat the player          │
```

## Consequences

- **Better:** a private table is truly private. Strangers can't join it even with every fact on the chain. Links can't be guessed. The game makes visible use of the Zama Protocol for something players feel.
- **Worse:** joining a private table takes 3 transactions, about 30 to 40 seconds instead of 12. A player's own wallet is asked 3 times. The first time after the upgrade, the permit is granted again to cover the new contract (automatic for embedded wallets, one prompt for a player's own wallet).
- **Cost per private join:** one `FHE.fromExternal`, one `FHE.eq` on `euint64`, and one public reveal. One `FHE.randEuint64` per private table. Measured HCU goes in the PR.
- **Size:** `Bluff` grows by an estimated 400 to 700 bytes, so the size rule must be relaxed or code moved out first (see the decision).
- **New contract** to deploy, verify and upgrade: `BluffInvites`. Deploy scripts, `validate-layout`, the contract reference, the size test and the Sepolia scenario test all grow to include it.
- **Migration:** none for funds. Tables made before the upgrade keep their numbers. Existing private tables can't take new players and expire under the 10-minute rule.
- **Packages:** none added.

## Verification

- **Hardhat, `invites.test.ts`:**
  - **Codes:** `newCode` only from `Bluff`; the code is decryptable by the host and by invited players, and **not** by a stranger or a player who failed (the confidentiality test Directive 10 asks for).
  - **Tries:** `tryCode` for the right and wrong code, its 3-try limit and its `NoCode` refusal.
  - **Confirming:** `confirmCode` with a forged or mismatched proof (refused), a false reveal (not invited), a replayed false proof (refused), and a repeat after success (no change).
  - **Every revert path,** and pausing.
- **Hardhat, `Bluff`:**
  - a stranger is refused at a private table, free and paid, with the payer's chips untouched;
  - an invited player joins both;
  - public tables are unchanged;
  - random ids never clash with an existing table and are never 0;
  - storage layout validated against 1.1.0;
  - the size test passes.
- **Vitest:**
  - invite links with and without a fragment, and `parseTableLink` with the fragment;
  - the host's link rebuilt after a reload;
  - the join action's steps, resuming after a reload, and the wrong-code and no-code screens.
- **Sepolia, two accounts:**
  - a free and a paid private table: create, copy the link, join, ready, start;
  - a third account with the table number but no code is refused;
  - a wrong code shows the toast.
