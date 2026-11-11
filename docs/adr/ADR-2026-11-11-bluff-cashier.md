# ADR-2026-11-11: A separate cashier contract for chips

- **Status:** Approved
- **Approved by:** (MarkDavid, 11th Nov 2026)
- **Companion:** [ADR-2026-11-11-bluff-cashier-for-dummies.md](ADR-2026-11-11-bluff-cashier-for-dummies.md)
- **Follows:** the fallback in [the game contracts plan](../plans/2026-11-11-game-contracts-plan.md), build step 7: "If `Bluff` is near the size limit, the chip handling moves into a separate `BluffCashier` contract, recorded in its own ADR."

## Context

Adding chips to `Bluff` (paid tables, the pay-and-join callback, the paid-in-full check, refunds and payouts) takes its deployed bytecode past Ethereum's 24,576-byte limit (EIP-170). Measured with Solidity 0.8.27, `cancun`:

| Compiler setting              | `Bluff` size | Headroom      |
| ----------------------------- | ------------ | ------------- |
| Optimizer, 800 runs (current) | 25,243 bytes | over by 667   |
| Optimizer, 200 runs           | 24,052 bytes | 524 bytes     |
| Optimizer, 1 run              | 23,578 bytes | 998 bytes     |
| `viaIR`, 200 runs             | 26,142 bytes | over by 1,566 |

The contracts are upgradeable so that bugs can be fixed after launch. A fix that adds even a few hundred bytes would no longer fit, and the only way out would then be a rushed split under pressure.

## Options considered

### Lower the optimizer runs

Fits today with 0.5 to 1 KB to spare and slightly higher gas per call (sponsored for players). Leaves almost no room for fixes, and the money logic stays mixed into the game logic.

### Move chip handling into an external library

Deployed libraries shrink `Bluff`, but OpenZeppelin's upgrade checker treats linked libraries as unsafe and needs `unsafeAllowLinkedLibraries`, weakening the upgrade-safety gate we rely on.

### A separate `BluffCashier` contract

`BluffCashier` holds every chip and owns every encrypted amount; `Bluff` runs the game and never touches chips.

- The cashier is the ERC-7984 receiver. A player's pay-and-join goes to the cashier, which records the payment and asks `Bluff` to create or join the table.
- When a paid table starts, `Bluff` asks the cashier to publish the paid-in-full flags and reads their handles back for `confirmSeats`.
- On leave, cancel and the end of the game, `Bluff` tells the cashier whom to refund or pay; the cashier moves the chips.
- Each contract accepts these calls only from the other.

## Decision

Split chip handling into `BluffCashier`, a second UUPS proxy with the same ownership, pause and upgrade rules as `Bluff`.

| Contract       | Holds                                                                                                |
| -------------- | ---------------------------------------------------------------------------------------------------- |
| `Bluff`        | Tables, seats, dice, bids, reveals, timeouts, endings. No chips.                                     |
| `BluffCashier` | The pay-and-join callback, `paid`, `paidInFull` and `pot` per table, refunds and payouts. All chips. |

The interface between them:

| Call                                                                   | From → to         | Does                                                       |
| ---------------------------------------------------------------------- | ----------------- | ---------------------------------------------------------- |
| `seatPaidPlayer(player, action, tableId, seatCount, buyIn, isPrivate)` | cashier → `Bluff` | Creates or joins a paid table; returns the table id        |
| `publishPayments(tableId, players)`                                    | `Bluff` → cashier | Makes the paid-in-full flags public; returns their handles |
| `refund(tableId, player)`                                              | `Bluff` → cashier | Returns a player's payment                                 |
| `payOut(tableId, winners)`                                             | `Bluff` → cashier | Splits the pot, remainder to the first winner              |

Both addresses are set once at initialisation. A second setter, owner-only, links the cashier to `Bluff` after both are deployed, and refuses to change it once set.

## Diagram

```
 player ── confidentialTransferAndCall(buy-in, table) ──► cUSDT
                                                           │ callback
                                                           ▼
                                                    BluffCashier ── seatPaidPlayer ──► Bluff
                                                    (chips, pot,  ◄── publishPayments ──┘ (game)
                                                     payments)    ◄── refund / payOut ──┘
```

## Consequences

- `Bluff` drops several kilobytes and keeps room for fixes; the cashier is small.
- Money and game logic are separated: a game bug cannot move chips except through the two narrow calls the cashier accepts.
- One more proxy to deploy, verify and upgrade; the deploy task, the deployments record and the docs cover both.
- Cross-contract calls cost a little more gas per paid action; sponsored for players.
- Free tables never touch the cashier.
- Tests gain a `cashier.test.ts` for the access rules between the two contracts; the step 7 tests stay as planned.

## Verification

`limits.test.ts` checks both contracts are under the limit with at least 2 KB to spare. Tests prove that only the cashier can seat paid players, only `Bluff` can trigger refunds and payouts, and that chips in equal chips out across every way a paid game can end.
