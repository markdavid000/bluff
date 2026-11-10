# ADR-2026-11-10: Game rules

- **Status:** Approved
- **Approved by:** (MarkDavid, 10th Nov 2026)
- **Companion:** [ADR-2026-11-10-game-rules-for-dummies.md](ADR-2026-11-10-game-rules-for-dummies.md)

## Context

Bluff is Liar's Dice. The rules must be fun, quick enough to finish a game in a few minutes on a 12-second-block network, cheap enough in FHE operations to stay under the per-transaction HCU limit, and enforceable entirely by the contract. Judges ask whether the game would break if its state were public, whether randomness is onchain and verifiable, and whether a full round can be played end to end on Sepolia.

## Options considered

### Table size and dice

- **Classic: up to 6 players, 5 dice each.** Long games: up to 29 rounds, each needing several transactions.
- **2 to 4 players, 3 or 5 dice each, chosen at table creation, default 3.** A 4-player game with 3 dice lasts at most 11 rounds.

### Rolling dice

- **Player-supplied seeds or commit-reveal.** Slower and gameable by the last revealer.
- **`FHE.randEuint8(8)` and reject 7 and 8.** Rejection needs a loop on encrypted values, which FHE cannot branch on.
- **`FHE.randEuint16()` reduced with `FHE.rem(value, 6)`, plus 1.** One encrypted random value per die; the bias is 4 in 65,536 for faces 1 to 4, which no player can exploit.

### Settling a challenge

- **Count matching dice under encryption and reveal only the count.** Keeps losing dice hidden, but costs an encrypted comparison and addition per die and shows players no evidence.
- **Reveal every die of the round, like lifting the cups.** One public decryption of all dice with a proof the contract verifies, then counting in the clear. Matches the physical game, gives players visible evidence, and uses fewer encrypted operations.

## Decision

**Tables**

- A table has 2 to 4 seats, a dice count of 3 or 5 per player, and a buy-in in chips that may be zero for a practice table.
- The creator sets these and takes the first seat. Others join until the table is full or the creator starts it with at least 2 players.
- A player may leave before the game starts and gets their buy-in back.

**Rounds**

- When a round starts, the contract rolls every remaining die with onchain randomness. Each die is stored encrypted and readable only by its owner (`FHE.allow` for the owner, `FHE.allowThis` for the contract).
- **Ones are wild**: they count as any face. Bids are made on faces 2 to 6.
- On their turn, a player either **raises** or **calls the bluff** on the previous bid. The first player of a round must raise.
- A raise is a higher quantity with any face, or the same quantity with a higher face. The quantity cannot exceed the dice in play.

**Calling a bluff**

- Calling marks every die of the round publicly decryptable. Any client then submits the clear values with the decryption proof; the contract checks it with `FHE.checkSignatures` and accepts the reveal for a round only once.
- The contract counts dice showing the bid face or a one. If the count is at least the bid quantity, the caller loses a die; otherwise the bidder loses a die.
- The player who lost a die starts the next round. A player with no dice is out. The last player with dice wins the pot.

**Time limits**

- Each turn has 90 seconds. After that, anyone can claim the timeout and the idle player loses a die, so a table can never be held hostage.
- If a reveal has not been submitted 90 seconds after a call, anyone can submit it; the app does so automatically for every player at the table.

**Chips**

- Chips are a confidential ERC-7984 token on Sepolia from the official testnet registry, the cUSDT test token unless the registry offers a better fit.
- Joining a paid table moves the buy-in into the contract with a confidential transfer; the winner receives the pot the same way.

## Diagram

```
 create ─► join ─► start
                     │
                     ▼
      ┌──► roll (encrypted, owner-only)
      │        │
      │        ▼
      │    raise ◄──┐ next player
      │        │    │
      │        ├────┘
      │        ▼
      │    call bluff ─► reveal all dice (public, proven)
      │                       │
      │                       ▼
      │               count ─► loser loses a die
      │                       │
      └───── more than one player with dice? ──no──► winner takes the pot
```

## Consequences

- The game breaks if state is public: anyone could read every hand. That is the confidentiality argument for judges.
- Randomness comes only from the contract's FHE randomness, so no player, nor the deployer, can choose or predict a roll.
- Every round ends with full, verifiable evidence of every die.
- Losing dice are shown at the reveal, as in the physical game. Counting under encryption to keep them hidden is a possible later variant.
- Cost per round: one encrypted random value, one remainder and one addition per die, plus access grants. With at most 20 dice per round this stays well under the per-transaction HCU limit; the exact figure is measured in the contract tests.
- The cUSDT test token's faucet and operator-approval flow must be confirmed against the registry before the chips feature is built.

## Verification

Contract tests on the FHEVM mock cover every rule above: seat limits, the raise ordering, ones wild, bids on ones rejected, both outcomes of a call, elimination, the winner payout, both timeouts, a replayed reveal rejected, and the wrong player failing to read another's dice. A full 3-player game is played on Sepolia before submission.
