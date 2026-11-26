---
date: 2026-11-26
branch: feat/unready-seats-and-expired-tables
base: dev
scenario-impact: none
---

# Hosts can remove a guest who isn't ready, and anyone can close an expired table

Builds the approved [ADR-2026-11-25-unready-seats-and-expired-tables](../adr/ADR-2026-11-25-unready-seats-and-expired-tables.md), batch 6 of the 2026-11-25 review plan. **`Bluff` 1.5.0 needs an upgrade on Sepolia, sent by the maintainer.** No new package.

## Contract (`Bluff` 1.5.0)

- **`removeUnready(id, player)`:**
  - who: the host, while Waiting, on a seated guest who isn't ready;
  - what: frees the seat and refunds a paid seat (it reuses `_leaveBeforeGame`), and emits `PlayerRemoved`;
  - the player is barred from that table: `joinFreeTable` and paid joins revert with `RemovedFromTable`, and a refused paid join rolls back the whole transfer;
  - new errors: `CannotRemoveHost`, `PlayerIsReady`.
- **`cancelTable`** no longer needs a seat. Anyone may close a Waiting table past its deadline, and everyone is refunded.
- **Storage:** one mapping (`barred`) appended at the end of `BluffStorage`. `validate-layout:sepolia` says it's a safe upgrade of the live proxy.
- **Size:** 24,266 bytes. The size test's headroom drops from 768 to 256 bytes, as the maintainer chose (see the ADR).

## Web

- **Remove** under each not-ready guest's seat, for the host, after a confirmation: "Remove Kola? They get back what they paid and can't sit at this table again."
- **Notices:** "The host removed Kola", and for the guest removed, "The host removed you from this table. Your chips are back with you."
- **Plain sentences** for `RemovedFromTable`, `PlayerIsReady` and `CannotRemoveHost`.
- **The lobby and Quick play** skip tables that are past their deadline or closing within a minute.
- **`useLeaveConfirm` is renamed `useConfirm`;** both Leave and Remove use it.

## Tests

- **Hardhat (267 passing):** red first for every new path:
  - removal, refund, and the bar on free and paid rejoins;
  - not host, ready, the host itself, not seated, and after the start;
  - anyone closing after the deadline, but not before.
- **The forged-reveal tests** now assert the exact failure, the KMS verifier's `KMSInvalidSigner`, instead of any revert. The signature check is what refuses a forged reveal.
- **Vitest:** red first for the lobby filter, the notices, the new error sentences, the waiting room hook's `canRemove` and `removePlayer`, and the Remove button with its confirmation.

## Docs

`docs/contracts.md`:

- the new function, event and errors, and the new size;
- the owner-key wording qualified;
- the accepted trade-offs: the one-bit payment check, the stuck-reveal incentive, and chips sent outside a join.

## After merging

The maintainer upgrades `Bluff` on Sepolia (`pnpm --filter @bluff/contracts upgrade:sepolia --contract Bluff`) and commits the updated `deployments/sepolia.json` and `.openzeppelin/` manifest. Then, live:

- remove a guest, and see them refused on rejoin;
- close an expired table from an account that isn't seated.
