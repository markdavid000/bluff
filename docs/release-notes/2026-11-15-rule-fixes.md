---
date: 2026-11-15
branch: fix/rule-fixes
base: dev
scenario-impact: needs_automation
---

# Longer turns, fair dice for short tables, and seats that stay put

Turns now allow 75 seconds on the chain, so the screen can show a full minute. A table started before it fills deals dice by the players who actually sit down, so two players always get 4 dice each. And a player who leaves a game and sits at a new table keeps that seat when the old game ends.

## Changes

- **Seats that stay put (`Bluff._endGame`, `Bluff._cancel`):** ending or cancelling a table clears a player's `tableOf` only when it still points at that table. A player who left mid-game and sat elsewhere was losing their new seat, which left them unable to ready up, leave or cancel there, and able to sit at a second table.
- **Dice by players (`Bluff._beginPlay`):** `dicePerPlayer` is set to 6 minus the players who start, just before the first round, in the field it already had. At creation it still holds the full-table number, which the create-table dialog now labels "N dice each when full".
- **Longer turns (`TableRules.TURN_LIMIT`):** 75 seconds, up from 45. The game screen's 60-second display follows in the web PR after #41, since that screen isn't on `dev` yet; until then its ring starts full and drains over the last 30 seconds.
- **Docs:** the player guide says 60 seconds a turn, and the contract docs say how dice are dealt.

No storage layout change, no new events, errors or functions, no packages. Live on Sepolia only after the `Bluff` proxy is upgraded, which needs the maintainer's go-ahead.

## Removed

- Nothing.

## Verification

- Hardhat, red then green: a leaver's seat at a new table survives the old game ending; a 4-seat table started with 2 players deals 4 dice each. The turn-limit tests and the random-game invariants advance the clock by the new limit.
- The full contract suite (238 tests), coverage (100% lines, 96% branches) and `validate-layout:sepolia`, which reports `Bluff` as a safe upgrade of the live proxy.
