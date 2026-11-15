# ADR-2026-11-14: Rule fixes from the audit

- **Status:** Approved
- **Approved by:** (MarkDavid, 15th Nov 2026)
- **Supersedes:** in [ADR-2026-11-10-game-flow-and-timing.md](ADR-2026-11-10-game-flow-and-timing.md), the turn timer (30 s shown, 45 s enforced) and "dice per player follow from the seats". Every other rule there stands.
- **Companion:** [ADR-2026-11-14-rule-fixes-for-dummies.md](ADR-2026-11-14-rule-fixes-for-dummies.md)

## Context

A full audit of the contracts before submission found one bug and one rule that disagree with the player guide. The maintainer also asked for longer turns after the playtests.

### 1. Ending a game can wipe a player's seat at another table

`_endGame` and `_cancel` delete `tableOf[player]` for every seat at the table (Bluff.sol:558-560, 576-579). A seat stays in the list after its player leaves mid-game or is removed for missed turns, but that player's `tableOf` was already cleared (Bluff.sol:507, 527). They are free to sit at a new table. When the old game ends, their `tableOf` for the **new** table is deleted.

Reproduced against the real fixture: Alice leaves game X and creates table Y. Bob leaves, so X ends. `tableOf(alice)` becomes 0 while Alice still holds seat 0 at Y. From then on:

- At Y she cannot ready up, leave or cancel (`NotAtTable`), so the host cannot start and, on a paid table, her buy-in cannot be refunded by her.
- She can create or join a second table while still seated at Y.
- The lobby and the app's "Back to your table" card stop finding Y.

The live Sepolia contract has this bug.

### 2. Dice per player follow the seats, not the players

`dicePerPlayer` is fixed when the table is created, as `6 − seatCount` (TableRules.sol:21, Bluff.sol:366). A host may start a table that is not full, so a 4-seat table started with 2 players deals **2 dice each**. The player guide (how-to-play.md) promises 4 dice each for 2 players, and 2-player games with 2 dice each are over in a few rounds with almost nothing to bluff with.

### 3. Turns are too short

The playtests showed 30 seconds is too little time to read the table, pick a bid and confirm it. The maintainer asked for **60 seconds**. The app shows the enforced limit minus 15 seconds of grace for the transaction to land (`TURN_GRACE_MS`), so the contract must allow 75 seconds.

## Options considered

### Seat bug: clear only seats that still point at this table

In `_endGame` and `_cancel`, delete `tableOf[player]` only when it equals the table's id. This is the smallest change and keeps every other path as it is.

### Seat bug: remove leavers from the seat list

Rejected. Seats are indexes for turn order, dice, reveals and payouts; removing them mid-game would shift every index and touch far more code.

### Dice: deal by the players who actually start

Set `dicePerPlayer = 6 − playerCount` in `_beginPlay`, just before the first round, using the existing storage field. Nothing new is stored, so the storage layout is unchanged. The table's maximum (`6 − seatCount`) is still emitted in `TableCreated` and shown while waiting as "dice each when full".

### Dice: keep the rule and fix the guide

Rejected by the maintainer: short-handed tables would keep playing with too few dice.

### Turns: 75 s enforced, 60 s shown

Change `TURN_LIMIT` to 75 seconds and the app's shown turn to 60 seconds; the 15-second grace stays.

## Decision

1. `_endGame` and `_cancel` clear `tableOf[player]` only when `tableOf[player] == id`.
2. `_beginPlay` sets `table.dicePerPlayer = DICE_BUDGET − playerCount` before dealing. `TableRules.dicePerPlayer` takes a player count.
3. `TableRules.TURN_LIMIT` becomes 75 seconds. The web app's `TURN_SHOWN_MS` becomes 60 seconds.
4. Ship as one upgrade of the `Bluff` proxy on Sepolia, after the storage-layout check passes. No other contract changes.

## Diagram

```
create table ── dicePerPlayer = 6 − seats (shown as "when full")
      │
start game ──── dicePerPlayer = 6 − players ──► deal ──► rounds (75 s per turn, 60 s shown)
      │
end or cancel ─ for each seat: if tableOf[player] == this table → clear it
                                otherwise leave it (they sit elsewhere now)
```

## Consequences

- A player who leaves a game can never lose their seat at their next table, and can never hold two seats.
- Short-handed tables play with the dice the guide promises: 2 players get 4 dice each at any table size.
- A 2-player game can last longer (up to 8 dice and 7 rounds), and turns are longer. The 15-minute game clock still caps every game.
- Games already running on Sepolia when the upgrade lands keep the dice they were dealt; tables still waiting get the new rule when they start. The seat fix also protects games that are already running.
- The web app changes: `TURN_SHOWN_MS` 60 s, and the create-table dialog's "N dice each" becomes "N dice each when full". The how-to-play guide changes 30 seconds to 60.
- No storage layout change, no new events, no new errors, no packages.

## Verification

- Hardhat, red then green: a test reproducing the seat wipe (leave game X, sit at Y, end X, then Y still works); a test that a 4-seat table started with 2 players deals 4 dice each; the turn timeout tests at 75 s.
- The full contract suite and coverage gate pass; `validate-layout` against Sepolia passes before the upgrade.
- Upgrade the `Bluff` proxy on Sepolia only after the maintainer approves that step, then check `TURN_LIMIT` behaviour and a short-handed start in a real game.
