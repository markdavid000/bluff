# ADR-2026-11-17: Everyone readies again when a paid table reopens

- **Status:** Approved
- **Approved by:** the maintainer, 2026-11-17, in chat
- **Companion:** [ADR-2026-11-17-ready-again-after-reopen-for-dummies.md](ADR-2026-11-17-ready-again-after-reopen-for-dummies.md)

## Context

When the host starts a paid table, it moves to `Verifying` while the keeper checks every buy-in. If a payment didn't arrive, `confirmSeats` removes that seat and `_reopen` puts the table back to `Waiting` with a new 10-minute limit. The same happens when someone leaves during `Verifying`.

`_reopen` doesn't touch `$.ready`. Everyone who pressed Ready for the first start stays ready, so the host can start again at once, for a different group of players, without anyone confirming. The maintainer chose on 2026-11-17 that a reopened table should start with everyone not ready.

**The constraint is size.** `limits.test.ts` keeps `Bluff` at least `BLUFF_HEADROOM` (896) bytes under the 24,576-byte limit, so the upgrade test's `BluffV2Mock` (about 260 bytes bigger) can still deploy. A fresh compile of `Bluff` today is 23,680 bytes: exactly at the rule, with 0 bytes spare. The rule was 2,048 bytes, then 1,536 (2026-11-12), then 896 (2026-11-13), each time with the maintainer's approval.

Measured fixes:

| Version                                            | `Bluff` | `BluffV2Mock` | Rule (≤ 23,680) |
| -------------------------------------------------- | ------- | ------------- | --------------- |
| Today                                              | 23,680  | n/a           | passes, 0 spare |
| Clear each seat's mark in `_reopen`, 50 runs (now) | 23,802  | 24,064        | 122 over        |
| The same, with the optimizer at 1 run              | 23,738  | 23,992        | 58 over         |

## Options considered

### A. Clear the marks in `_reopen` and lower the rule to 768 bytes (chosen)

One loop in `_reopen` deletes `$.ready[id][player]` for every remaining seat. `BLUFF_HEADROOM` drops from 896 to 768.

- **`Bluff`:** 23,802 bytes, 774 under the hard limit.
- **`BluffV2Mock`:** 24,064 bytes, still deploys with 512 spare.
- **No storage change,** so the layout check is unaffected.
- **No new event:** `TableReopened` already fires in the same transaction, and the app already refreshes the table on it. Its meaning becomes "the table is waiting again, and nobody is ready."

### B. Shrink the code with the optimizer at 1 run

Saves 64 bytes but still breaks the rule by 58. It makes every move cost slightly more gas and rebuilds all of `Bluff`'s bytecode for no gain. Rejected.

### C. Free room by moving other code out of `Bluff`

A bigger refactor and upgrade, with more risk four weeks before the deadline, to fix a rare case. Rejected.

### D. Leave it

Players who were ready for one group can be started into a game with another group without confirming. Rejected by the maintainer.

## Decision

Option A. `_reopen` clears every remaining seat's ready mark before the table waits again. `BLUFF_HEADROOM` becomes 768. `Bluff` goes to 1.4.0, upgraded on Sepolia only with the maintainer's explicit yes. The app's "The table is open again" notice adds "Press Ready to play."

## Diagram

```
startTable (all ready) ──► Verifying ──► confirmSeats: a payment missing
                                           │
                                           ▼
                                   _removeSeat(unpaid)
                                           │
                                           ▼
                         _reopen: status = Waiting, new deadline,
                         ready[id][each seat] = false   ◄── new
                                           │
                                           ▼
                                emit TableReopened ──► app refreshes:
                                                       every mark shows not ready,
                                                       "Press Ready to play."
```

## Consequences

- **Better:** a reopened table can only start after every non-host presses Ready again for the new group.
- **Costs:**
  - 122 bytes, leaving `Bluff` 774 bytes under the hard limit instead of 896;
  - a little gas in `_reopen`: one storage delete per remaining seat, at most 3.
- **Upgrade:** `Bluff` 1.3.0 to 1.4.0 through `upgrade:sepolia`, after `validate-layout:sepolia`. Tables already reopened before the upgrade keep their old marks; only new reopens clear them.
- **Packages:** none added or removed.

## Verification

- **Hardhat, red then green:**
  - after a payment fails and the table reopens, every remaining mark reads false in `getTable`;
  - `startTable` reverts with `NotEveryoneReady` until each non-host readies again, then starts;
  - the same holds when a player leaves during `Verifying`;
  - a free table, which never verifies, keeps its marks as today.
- **Existing tests still pass:** the size test with the new rule, the upgrade test, and `confidentiality.test.ts`.
- **Vitest:** the reopen notice's new wording.
- **Sepolia, after the approved upgrade:** two accounts reopen a paid table and see both marks cleared.
