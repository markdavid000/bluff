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

No storage layout change, no new events, errors or functions, no packages.

- **Live on Sepolia (2026-11-15):** the `Bluff` proxy `0x46B6…E23e` was upgraded from 1.2.0 to 1.3.0, implementation [`0x10f1…609f`](https://sepolia.etherscan.io/address/0x10f13f5eAc28799083555FD69A3De0834A77609f#code), verified on Etherscan, with the maintainer's go-ahead. After the upgrade the owner, the cashier and invites links, the paused flag and existing tables all read as before.

## Removed

- Nothing.

## Verification

- Hardhat, red then green: a leaver's seat at a new table survives the old game ending; a 4-seat table started with 2 players deals 4 dice each. The turn-limit tests and the random-game invariants advance the clock by the new limit.
- The full contract suite (238 tests), coverage (100% lines, 96% branches) and `validate-layout:sepolia`, which reports `Bluff` as a safe upgrade of the live proxy.
