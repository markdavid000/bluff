# ADR-2026-11-10: Game flow and timing

- **Status:** Approved
- **Approved by:** (MarkDavid, 10th Nov 2026)
- **Supersedes:** in [ADR-2026-11-10-game-rules.md](ADR-2026-11-10-game-rules.md), the dice count, the time limits and the end of the game. Every other rule there stands.
- **Superseded in part by:** [ADR-2026-11-11-chips-and-buy-ins.md](ADR-2026-11-11-chips-and-buy-ins.md) (claiming more practice chips, the "not enough chips" case); [ADR-2026-11-12-route-protection.md](ADR-2026-11-12-route-protection.md) (watching needs sign-in)
- **Companion:** [ADR-2026-11-10-game-flow-and-timing-for-dummies.md](ADR-2026-11-10-game-flow-and-timing-for-dummies.md)
- **Player guide:** [how-to-play.md](../how-to-play.md)

## Context

The game rules ADR defines how a round is played. It does not define the journey around it: signing up, finding a table, waiting for players, leaving, timeouts, ending, and what happens when something goes wrong. It also leaves game length open, and the numbers show that it is too long.

### How long things take

Every move is a transaction. On Sepolia a block is about 12 seconds, so a move is confirmed 12 to 24 seconds after it is sent. These estimates assume an embedded wallet with no confirmation screen; they are checked in the Privy spike and in the first playtest.

| Step                                    | Estimate    |
| --------------------------------------- | ----------- |
| A turn (thinking plus confirmation)     | 25 to 35 s  |
| Calling a bluff                         | about 15 s  |
| The reveal (decryption plus settlement) | 20 to 30 s  |
| Showing the result                      | 5 s         |
| A round with 3 bids                     | about 2 min |

A game ends after at most (total dice minus 1) rounds. With the earlier "3 dice each" rule:

| Players | Dice in play | Rounds, at most | Length, at most |
| ------- | ------------ | --------------- | --------------- |
| 2       | 6            | 5               | about 10 min    |
| 3       | 9            | 8               | about 16 min    |
| 4       | 12           | 11              | about 22 min    |

A 4-player game could run past 20 minutes. Casual online games of this kind usually last 5 to 15 minutes.

## Options considered

### Making games shorter

- **Bids off the chain, signed by each player and relayed through a realtime service; only calls and reveals on the chain.** Rounds would take about a minute. Needs a realtime server, signature checks in the contract and a fallback for a player who withholds a bid. Too much risk for five weeks; revisit after submission.
- **A fixed number of dice per player.** Simple, but the length still grows with the number of players.
- **Dice per player chosen so every table starts with about 8 dice, plus a game clock.** Length becomes nearly the same for every table size, and the clock puts a hard ceiling on it.

### Turn timer

- **90 seconds** (the earlier rule). Too slow: one idle player can add minutes to every round.
- **30 seconds shown to the player, 45 seconds enforced by the contract.** The extra 15 seconds covers the confirmation time, so a player who acts in time is never penalised for a slow block.

## Decision

### Table setup

| Seats chosen | Dice each | Dice in play at the start |
| ------------ | --------- | ------------------------- |
| 2            | 4         | 8                         |
| 3            | 3         | 9                         |
| 4            | 2         | 8                         |

- The creator picks only two things: **seats** (2, 3 or 4) and **buy-in** (Free, 10, 25 or 50 chips). Dice per player follow from the seats.
- A table is **public** (listed in the lobby, open to anyone) or **private** (not listed; joined with its invite link).
- **Game clock: 15 minutes**, starting with the first roll.

Expected length: 8 to 12 minutes; never more than about 17 (the clock plus the round in progress).

### The journey

1. **Front page.** "Play now" and "How to play".
2. **Sign in.** Continue with Google, Continue with email, or Use my own wallet.
3. **First time only:**
   - The player gets a generated nickname ("Brave Otter"), which they can change.
   - They receive **100 practice chips**. More can be claimed once every 24 hours when their balance is under 10.
   - Saving the nickname and claiming the chips happen in one move.
4. **Lobby.** Four ways in:
   - **Play now:** join the oldest open public table with the player's chosen buy-in, or create one if none is open.
   - **Create a table:** seats, buy-in, public or private.
   - **Join with a link:** for private tables.
   - **Open tables:** a list of public tables waiting for players.
5. **Waiting room.**
   - Shows the seats, the buy-in, an invite link and a 10-minute countdown.
   - The **host** (the creator) can start once 2 players are seated.
   - The table starts by itself when the last seat is filled.
6. **Game.** Rounds as in the game rules ADR, with the timings below.
7. **Results.**
   - Shows the winner, the chips won and every player's final dice count.
   - **Play again** creates a new table with the same settings and invites everyone from this one.
   - **Back to lobby.**

A player can be at one table at a time. Joining another table is refused until they leave the current one or it ends.

### The round, step by step

1. **Roll.** The contract rolls every remaining die. The first round's roll happens in the transaction that starts the game; later rolls happen in the transaction that settles the previous reveal, so no separate step is needed.
2. **Peek.** Each player's own dice are revealed to them alone in their browser; a roll animation covers the few seconds this takes.
3. **Bidding.**
   - The starter makes the first bid; calling a bluff is not allowed before a bid exists.
   - Each next player either raises or calls.
   - When the bid reaches every die in play showing a six, the only move left is to call.
4. **Call.** The caller's move makes every die of the round public. Every player's app then fetches the reveal and submits it; the first to land settles the round, and the rest are refused harmlessly.
5. **Result.** All dice are shown for 5 seconds with the count and who loses a die. The next round's dice are already rolled.

The player who lost the die starts the next round. If that player is out, the next player still in the game starts. The first round is started by the host.

### Time limits

| Moment                       | Shown to the player | Enforced by the contract            | When it runs out                                                                                                                       |
| ---------------------------- | ------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| A turn                       | 30 s                | 45 s after the previous move landed | Anyone can claim the timeout. The idle player loses a die and a new round starts with the next player.                                 |
| Two missed turns in one game |                     |                                     | The player is removed, as if they had left.                                                                                            |
| The reveal                   | "Revealing dice…"   | 3 min after the call                | Anyone can submit the reveal at any time; the apps retry on their own.                                                                 |
| A stuck reveal               |                     | 10 min after the call               | Anyone can cancel the game: the chips in the pot are shared equally by the players still in it.                                        |
| The waiting room             | 10 min countdown    | 10 min after creation               | With 2 or more players the host may still start; anyone seated may cancel; with fewer than 2 it is cancelled and buy-ins are returned. |
| The game clock               | 15 min countdown    | 15 min after the first roll         | The round in progress is the last one.                                                                                                 |

Claiming a timeout is automatic: every player's app claims it the moment it is due, so a game never waits for someone to press a button.

### Ending the game

- **Last player with dice** wins the whole pot.
- **Game clock ran out:** after the last round, the player with the most dice wins. Players tied for the most dice share the pot equally; chips that do not divide evenly go to the tied player who joined first.
- **Everyone else left or was removed:** the remaining player wins at once.
- **Stuck reveal cancelled:** the pot is shared equally by the players still in the game.
- The payout happens in the same transaction that ends the game.

### Leaving

| When                   | What happens                                                                                                                  |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| In the waiting room    | The buy-in is returned. If the host leaves, the next player to have joined becomes host. If nobody is left, the table closes. |
| During a game          | The player forfeits: they are out, and their buy-in stays in the pot. If it was their turn, play passes to the next player.   |
| During a reveal        | Their dice still count for this round, because they were already rolled and called on. They are out once it settles.          |
| By closing the browser | Nothing special: the turn timer runs. Returning restores the game from the contract, own dice included.                       |

The penalty for leaving a game is losing the buy-in. There is no other penalty and no ban.

### Edge cases

| Case                                                 | Handling                                                                                                    |
| ---------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| Two players act at the same moment                   | Only the player whose turn it is can move; the contract refuses everyone else, and their app explains it.   |
| A bid that does not beat the last one, or names ones | Refused in the app before sending, and by the contract.                                                     |
| A bid larger than the dice in play                   | Refused.                                                                                                    |
| Not enough chips for a table                         | Join is refused; the app offers to claim practice chips if eligible.                                        |
| A table fills while a player is joining              | Their move is refused; the app offers Play now.                                                             |
| The host never starts a full table                   | Impossible: a full table starts by itself.                                                                  |
| A player's move fails (network, sponsorship)         | An error toast with Try again; the turn timer keeps running, so the app warns when less than 10 s are left. |
| A second tab or device                               | Both show the same game; moves from either count; the contract keeps one truth.                             |
| A player in two games                                | Refused by the contract.                                                                                    |
| Players colluding with several accounts              | Not preventable at this stage; noted as a known limit.                                                      |

### Watching

A public game in progress can be watched read-only from the lobby: bids, dice counts and reveals, never hidden dice. Watching needs sign-in, like every game page ([ADR-2026-11-12-route-protection](ADR-2026-11-12-route-protection.md) superseded the earlier "no sign-in" rule).

## Diagram

```
 front page ─► sign in ─► first time? ─yes─► nickname + 100 chips ─┐
                              │no                                  │
                              ▼                                    │
                            lobby ◄────────────────────────────────┘
          ┌──────────┬────────┴─────────┬──────────────┐
      Play now   Create table      Join with link   Open tables   (Watch)
          └──────────┴────────┬─────────┴──────────────┘
                              ▼
                        waiting room ── 10 min, < 2 players ──► cancelled, refunds
                              │ full, or host starts
                              ▼
                ┌────► roll ─► peek ─► bid / raise ◄─┐ 45 s per turn
                │                         │──────────┘
                │                         ▼
                │                     call bluff ─► reveal ─► lose a die
                │                                              │
                └──── 2+ players with dice, clock not out ◄────┤
                                                               ▼
                                                     results ─► Play again / lobby
```

## Consequences

- Games last 8 to 12 minutes whatever the table size, with a hard ceiling around 17.
- Fewer choices when creating a table: seats and buy-in only.
- Every way a game can stall (an idle player, a player who left, a stuck reveal, an empty waiting room) has a deadline that anyone can enforce, and the apps enforce it automatically.
- The contract grows: table lifecycle, the clock, timeouts, leaving, tie payouts, the practice-chip faucet and nicknames. Each part gets its own tests.
- With 4 players and 2 dice each, the opening rounds have little information to bluff with; the first playtests will tell whether the dice table needs tuning.
- Off-chain bids remain the next big speed improvement, recorded as a future option.

## Verification

- Contract tests cover every row of the time limits, leaving and edge-case tables, both ways a game ends, the tie split with an odd remainder, and the one-table-per-player rule.
- Before submission, timed playtests on Sepolia with 2, 3 and 4 players record actual game lengths against the 8 to 12 minute target.
