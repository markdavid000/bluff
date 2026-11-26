# ADR-2026-11-25: Hosts can remove a guest who isn't ready, and anyone can close an expired table

- **Status:** Accepted
- **Approved by:** the maintainer, 2026-11-26. Size: lower the size test's required headroom from 768 to 256 bytes (chosen in chat).
- **Companion:** [ADR-2026-11-25-unready-seats-and-expired-tables-for-dummies.md](ADR-2026-11-25-unready-seats-and-expired-tables-for-dummies.md)
- **Amends:** [ADR-2026-11-10-game-flow-and-timing](ADR-2026-11-10-game-flow-and-timing.md), [ADR-2026-11-12-waiting-room-and-ready](ADR-2026-11-12-waiting-room-and-ready.md)

## Context

The 2026-11-25 contract review (`origin/dev` 5f6a7b3) found no confidentiality leak and no lost or double-paid chips. It did prove two ways a waiting table can be held hostage.

**1. A seat at a paid table, paid with nothing.** `BluffCashier.onConfidentialTransferReceived` seats the player (`Bluff.seatPaidPlayer`) before anyone can know whether the encrypted payment was full. A player with 0 chips sends a transfer that moves 0, and is seated with `paid = 0`. Then:

- **If they never press Ready,** `startTable` reverts with `NotEveryoneReady` forever. The host has no way to remove them, and the table only dies at its 10-minute deadline.
- **If they do press Ready,** the payment check removes them (`SeatRemoved`), and the table reopens with every ready mark cleared. They can rejoin for free and do it again.

The review's probe test showed both. Each spare address blocks one paid table at no cost, and free tables can be squatted the same way by never pressing Ready.

**2. An expired waiting table can only be closed by someone seated at it.** `cancelTable` requires `_requireSeated`. If the host goes away, the table stays listed in the lobby past its deadline, and Quick play may pick it. A paid table's buy-ins stay in the cashier until a seated player comes back. ADR-2026-11-10 said an empty waiting room "has a deadline that anyone can enforce"; the code doesn't allow that.

**Also from the review, documentation only:**

- **The payment check reveals one bit.** After a payment check, anyone can read whether a seat paid in full, which shows a player had less than the buy-in.
- **The owner key can upgrade every contract,** so "the owner cannot move chips or read any encrypted value" (`docs/contracts.md`) holds only until an upgrade.
- **`cancelStuckReveal`** can share a pot with a player the public reveal shows has lost, if nobody settles within 10 minutes.
- **Chips sent to the cashier without a join** can't be recovered.
- **The forged-reveal tests** assert only "reverted", not `InvalidKMSSignatures`.

## Options considered

### For the squatter

- **A. The host removes a guest who isn't ready (chosen).** A new `removeUnready(id, player)`:
  - host only, while Waiting;
  - the player is seated, isn't the host, and isn't ready;
  - their payment, whatever arrived, is refunded through the cashier, as when leaving;
  - they're barred from rejoining that table.

  It also fixes free tables. It needs one new function, one event, one error and one storage mapping.

- **B. Refuse a paid join unless the payment is full.** Impossible as things stand: the amount is encrypted at the moment of joining, and the contract can't branch on it.
- **C. Let the host start the payment check without everyone ready.** It changes the ready rule for every table and still doesn't help free tables.

### For the expired table

- **A. Anyone may call `cancelTable` once the deadline has passed (chosen),** and the lobby hides tables past their deadline. It's one check removed, and it already refunds everyone.
- **B. Only hide expired tables in the lobby.** The lobby looks tidy, but buy-ins stay locked until a seated player returns.

## Decision

**`Bluff` gets one upgrade (`version()` bumped), through the existing UUPS path and the layout check:**

1. **`removeUnready(uint256 id, address player)`:**
   - **Who and when:** reverts unless the table is Waiting (`WrongStatus`), the caller is the host (`NotHost`), and the player is seated (`NotAtTable`). The player must not be the host (`CannotRemoveHost`) and must not be ready (`PlayerIsReady`).
   - **What it does:** the same as `_leaveBeforeGame` for that player: free the seat, refund a paid seat through `cashier.refund`, and reopen or relist as today. It also records `barred[id][player] = true`.
   - **Event:** a new `PlayerRemoved(id, player)`, separate from `SeatRemoved` (which stays "removed for not paying"), so the notices stay accurate.
2. **Barred players can't rejoin.** `joinFreeTable` and `seatPaidPlayer` revert with `RemovedFromTable(id)` for a barred player. A refused paid join reverts the whole confidential transfer, so no chips move.
3. **`cancelTable`** no longer requires a seat. Once the deadline has passed, anyone may close a Waiting table, and everyone is refunded as today.
4. **Storage:** one mapping, `barred`, appended at the end of `BluffStorage`. The ERC-7201 namespace is unchanged, and the upgrade's layout check must pass.
5. **Web, in the waiting room:**
   - the host sees **Remove** on each guest's seat badge while that guest isn't ready, through the shared action status, after a confirmation;
   - the removed player is told plainly;
   - the lobby and Quick play skip tables past their deadline;
   - the keeper still cancels expired tables for seated players, and anyone else, the computer included, now may too.
6. **Docs (`docs/contracts.md`):**
   - qualify the owner-key wording: the owner can upgrade, so ownership must move to a multisig before any real value is involved;
   - state the one-bit payment leak and the stuck-reveal incentive as accepted trade-offs;
   - say chips sent outside a join can't be recovered.
7. **Tests:**
   - Hardhat tests for every new revert, the refund of a removed paid seat, the bar on rejoining, and anyone cancelling after the deadline;
   - a confidentiality check that a removed player loses access to nothing they didn't own;
   - the forged-reveal tests assert `InvalidKMSSignatures` by name.

## Diagram

```
 waiting room (host)                     contract (Bluff)
 [Remove] on a not-ready guest ──► removeUnready(id, guest)
                                    ├─ host? waiting? seated? not host? not ready?
                                    ├─ free seat, cashier.refund (paid), relist/reopen
                                    ├─ barred[id][guest] = true
                                    └─ emit PlayerRemoved
 guest tries again ───────────────► joinFreeTable / seatPaidPlayer ──► revert RemovedFromTable

 anyone, after the deadline ──────► cancelTable(id) ──► refund all, TableCancelled
 lobby / Quick play ──► skip tables whose deadline has passed
```

## Contract size

`Bluff` was already 23,802 bytes on `dev`, 6 bytes inside the size test's 768-byte headroom (24,576-byte limit). The change adds 464 bytes, even after removal reuses `_leaveBeforeGame`, for 24,266 bytes. Optimising for size (`runs` 1) would save only 64 bytes.

The maintainer chose to lower the required headroom to 256 bytes, which leaves 310 bytes below the hard limit. Any later feature in `Bluff` larger than a few checks must go in a separate contract.

## Consequences

- **Better:**
  - a squatter can no longer hold a paid or free table hostage;
  - dead tables leave the lobby and release their buy-ins without waiting for their players.
- **Costs:**
  - one upgrade of `Bluff` on Sepolia, sent by the maintainer from the deployer key (`pnpm --filter @bluff/contracts upgrade:sepolia --contract Bluff`); the agent never handles that key;
  - a new host control in the waiting room.
- **Hosts gain power** to remove guests who haven't pressed Ready. That's acceptable: they already choose who to invite, and a ready guest can't be removed.
- **Unchanged:** dice confidentiality, payouts, the game itself, `BluffCashier`, `BluffInvites`, `ChipFaucet`, and the computer service (it's never removed, because it's ready as soon as it sits down).
- **Packages:** none added or removed.

## Verification

- **Hardhat:**
  - every new revert path by name;
  - a removed paid seat's refund;
  - rejoining refused, free and paid (with the transfer rolled back);
  - a stranger cancelling after the deadline but not before;
  - the storage layout check;
  - coverage stays above its bar.
- **Vitest:**
  - the Remove control (host only, guest not ready, confirmation, action status);
  - the removed notice;
  - the lobby skipping expired tables.
- **`pnpm preflight`,** then the Sepolia upgrade by the maintainer (approved separately at the time), then a live check:
  - host and guest, Remove, the guest refused on rejoin;
  - a stranger closing an expired table.
