---
date: 2026-11-11
branch: feat/call-and-reveal
base: dev
scenario-impact: none
---

# Calling a bluff and the reveal

Players can now call a bluff. Every die of the round becomes public, anyone submits Zama's decryption with its proof, and the contract verifies it, counts the matching dice with ones wild, and takes a die from whoever was wrong. A player with no dice left is out; the last player with dice wins.

## Changes

- `callBluff(id)`: the player on turn calls the current bid. Every die of the round is made publicly decryptable; the table moves to `Revealing` with a 10-minute limit.
- `revealHandles(id)`: the dice handles in the exact order the proof must cover.
- `settleReveal(id, clearValues, proof)`: verifies with `FHE.checkSignatures`, counts dice showing the bid face or a one, and takes a die from the caller (true bid) or the bidder (bluff). A reveal is accepted once; an old reveal cannot settle a later round.
- Elimination at zero dice. The loser starts the next round, or the next active player if the loser is out, and turns skip players who are out.
- The minimal end of the game: when one player has dice, the table finishes, `GameEnded(id, LastPlayerStanding, winners)` is emitted, and every player is free to join another table. The clock, timeouts, leaving and payouts follow in build steps 6 and 7.
- `TableView.caller`, `EndReason`, and the events `BluffCalled`, `RoundSettled` (with the revealed faces), `PlayerEliminated`, `GameEnded`; the error `NoBidToCall`.
- `callBluff` updates state before calling Zama's ACL, following checks, effects, interactions.

## Removed

- Nothing.

## Verification

- 98 contract tests pass: both outcomes of a call, ones wild, a forged reveal, a replayed reveal, a stale reveal from an earlier round, elimination, the end of the game, and turns skipping an eliminated player. Coverage is 100% of lines and 99% of branches.
- Slither: no medium or higher findings. The low `reentrancy-events` note on `settleReveal` is the call to Zama's KMS verifier, which must run first because it is the check.
- `pnpm preflight` passes.
