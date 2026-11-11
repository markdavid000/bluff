---
date: 2026-11-11
branch: feat/rolling-and-bidding
base: dev
scenario-impact: none
---

# Hidden dice and bidding

When a game starts, every player's dice are rolled with onchain FHE randomness and stored encrypted, readable only by their owner. Players then take turns bidding, each bid beating the last, with a 45-second deadline per turn.

## Changes

- `Bluff`: starting a game deals every player their dice and starts round 1 with the host on turn. Each die is `rem(randEuint16(), 6)` cast to `euint8`, granted to the contract and to its owner only.
- `placeBid(id, quantity, face)`: only the player on turn; faces 2 to 6; quantities from 1 to the dice in play; each bid must beat the last. The turn passes to the next active seat and the deadline resets to 45 seconds.
- `diceOf(id, player)`: the handles of a player's current dice.
- Events `RoundStarted` and `BidPlaced`; errors `NotYourTurn`, `InvalidFace`, `InvalidQuantity`, `BidNotHigher`.
- Tests: `rounds.test.ts` (dice per seat count, values 0 to 5, every face seen across 64 dice, other players cannot decrypt), `bidding.test.ts` (turn order, every bid rule, the highest bid leaves only a call), and an upgrade test proving dice stay readable by their owner after an upgrade.
- Contract tests deploy fresh contracts per test instead of `loadFixture`, following Zama's template; snapshot reverts left the FHEVM mock ahead of the chain.

## Removed

- `loadFixture` from every contract test.

## Verification

- 83 contract tests pass; coverage is 100% of lines and 98% of branches. The two untested branches skip inactive seats, which arrive with leaving and elimination in build step 6.
- Slither: no medium or higher findings.
- `pnpm preflight` passes.
