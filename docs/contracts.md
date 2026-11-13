# Contract reference

The reference for Bluff's contracts: what each one does, every external function, its events and errors, who can read which encrypted value, the owner's powers, and how upgrades work. It stands in for NatSpec, which this repository does not use (see [Comments](engineering-standards.md#comments)).

Deployed addresses live in [`packages/contracts/deployments/sepolia.json`](../packages/contracts/deployments/sepolia.json), the single source the web app reads.

> This project is not audited, endorsed or operated by Zama. Use at your own risk.

## The contracts

| Contract       | Holds                                                                                        | Talks to                         |
| -------------- | -------------------------------------------------------------------------------------------- | -------------------------------- |
| `Bluff`        | Tables, seats, encrypted dice, bids, calls, reveals, timeouts, the clock, endings. No chips. | `BluffCashier`, `BluffInvites`   |
| `BluffCashier` | Every chip: the pay-and-join callback, encrypted payments and pots, refunds, payouts.        | `Bluff`, the chip token          |
| `BluffInvites` | Each private table's encrypted invite code, players' tries at it, and who is invited.        | `Bluff`                          |
| `ChipFaucet`   | Daily practice chips and nicknames.                                                          | The chip token and its mock USDT |

All four are UUPS proxies with `Ownable2Step`, a pause switch and `version()`. Their state lives in ERC-7201 namespaces: `bluff.storage.Bluff`, `bluff.storage.BluffCashier`, `bluff.storage.BluffInvites` and `bluff.storage.ChipFaucet`.

Table ids are random numbers below 2^48, made from `block.prevrandao`, the host and a counter, and never 0 or an id already in use ([ADR-2026-11-13-private-tables-and-table-ids](adr/ADR-2026-11-13-private-tables-and-table-ids.md)). They aren't secret: the invite code is what keeps a private table private.

On Sepolia the chip token is Zama's `cUSDTMock` (`0x4E7B06D78965594eB5EF5414c357ca21E1554491`). It has 6 decimals and a wrap rate of 1, and wraps the public-mint `USDTMock` (`0xa7dA08FafDC9097Cc0E7D4f113A61e31d7e8e9b0`).

## Bluff

### Player actions

| Function                                | Caller                | Allowed when                                    | Does                                                                                                              |
| --------------------------------------- | --------------------- | ----------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| `createFreeTable(seatCount, isPrivate)` | anyone not at a table | not paused                                      | Creates a free table; the creator takes seat 0 and hosts. A private table gets an invite code. Returns the id.    |
| `joinFreeTable(id)`                     | anyone not at a table | `Waiting`, a seat free, free table, not paused  | Takes the next seat; a private table needs the player invited. A full table waits for its host.                   |
| `setReady(id, isReady)`                 | seated player         | `Waiting`                                       | Marks the player ready or not ready; emits `PlayerReady`. A player who leaves loses their mark.                   |
| `startTable(id)`                        | host                  | `Waiting`, 2+ players, every other player ready | Starts a free game, or the payment check of a paid one. Otherwise reverts with `NotEveryoneReady`.                |
| `leaveTable(id)`                        | seated player         | any open status                                 | Before the game: refund and free the seat. During it: forfeit, pass the turn, end the game if one player is left. |
| `cancelTable(id)`                       | seated player         | `Waiting`, lobby limit passed                   | Cancels and refunds everyone.                                                                                     |
| `placeBid(id, quantity, face)`          | player on turn        | `Playing`                                       | Raises: faces 2 to 6, quantity 1 to the dice in play, higher than the last bid.                                   |
| `callBluff(id)`                         | player on turn        | `Playing`, a bid exists                         | Makes every die of the round publicly decryptable; status `Revealing`.                                            |

### Anyone-can-call actions

These keep a table moving; the web app sends them automatically.

| Function                               | Allowed when                    | Does                                                                                                                                  |
| -------------------------------------- | ------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| `confirmSeats(id, clearValues, proof)` | `Verifying`                     | Checks the paid-in-full reveal with `FHE.checkSignatures`. Removes unpaid seats and reopens, or rolls round 1.                        |
| `cancelVerification(id)`               | `Verifying`, 10 minutes passed  | Cancels and refunds everyone.                                                                                                         |
| `settleReveal(id, clearValues, proof)` | `Revealing`                     | Checks the dice reveal, counts the bid face and ones, takes a die from whoever was wrong, then rolls the next round or ends the game. |
| `claimTimeout(id)`                     | `Playing`, turn deadline passed | The idle player loses a die, or is removed on a second miss; the next player starts a new round.                                      |
| `cancelStuckReveal(id)`                | `Revealing`, 10 minutes passed  | Ends the game, shared by everyone still in it.                                                                                        |

### Called only by the cashier

| Function                          | Does                                                                                    |
| --------------------------------- | --------------------------------------------------------------------------------------- |
| `seatPaidPlayer(player, request)` | Creates or joins a paid table for a paying player. Returns the table id and its buy-in. |

### Owner

`setCashier(address)` (once), `setInvites(address)` (once), `pause()`, `unpause()`, `upgradeToAndCall(...)`, `transferOwnership` and `acceptOwnership`.

### Views

`getTable(id)` returns the table and its seats, each with its ready mark. Also: `openTables(offset, limit)`, `openTableCount()`, `tableOf(player)`, `diceOf(id, player)`, `revealHandles(id)` (dice while `Revealing`, payment flags while `Verifying`), `cashier()`, `invites()`, `version()`.

### Events

`TableCreated`, `PlayerJoined`, `PlayerLeft`, `PlayerReady`, `HostChanged`, `TableCancelled`, `TableListed`, `TableUnlisted`, `SeatVerificationStarted`, `SeatRemoved`, `TableReopened`, `GameStarted`, `RoundStarted`, `BidPlaced`, `BluffCalled`, `RoundSettled` (with every revealed face), `PlayerEliminated`, `TurnTimedOut`, `TurnPassed`, `GameEnded` (with reason and winners), `CashierSet`, `InvitesSet`. Every event indexes the table id, and the player where there is one.

### Errors

`TableNotFound`, `WrongStatus`, `AlreadyAtTable`, `NotAtTable`, `NotHost`, `NotEnoughPlayers`, `NotEveryoneReady`, `TableFull`, `InvalidSeatCount`, `InvalidBuyIn`, `DeadlineNotPassed`, `NotYourTurn`, `InvalidFace`, `InvalidQuantity`, `NoBidToCall`, `BidNotHigher`, `NotCashier`, `CashierAlreadySet`, `NotInvited`, `InvitesAlreadySet`, `ZeroAddress`. Each carries the values the app needs to explain it.

## BluffCashier

| Function                                                                                  | Caller                          | Does                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------------------------- | ------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `onConfidentialTransferReceived(operator, from, amount, data)`                            | the chip token only, not paused | Pay-and-join. `data` is a `JoinRequest` (action, table id, seats, buy-in, private). Seats the player, records `paid` and `paidInFull`, adds to the pot, and returns `paidInFull` so the token refunds a payment that is not exactly the buy-in. |
| `publishPayments(id, players)`                                                            | `Bluff` only                    | Makes the paid-in-full flags publicly decryptable.                                                                                                                                                                                              |
| `refund(id, player)`                                                                      | `Bluff` only                    | Returns what the player paid.                                                                                                                                                                                                                   |
| `payOut(id, winners)`                                                                     | `Bluff` only                    | Splits the pot; the first winner also gets the remainder.                                                                                                                                                                                       |
| `paymentHandles(id, players)`, `paymentOf(id, player)`, `chips()`, `bluff()`, `version()` | view                            |                                                                                                                                                                                                                                                 |

Events: `PaymentRecorded`, `Refunded`, `PotPaid`. Each carries the encrypted amount handle, which its recipient can decrypt.

Errors: `UnauthorizedCallback`, `InvalidCallbackData`, `NotBluff`, `ZeroAddress`.

## ChipFaucet

| Function                                                                                                                                                                            | Does                                                                                                                                                           |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `claim(nickname)`                                                                                                                                                                   | 100 chips every 24 hours: mints `100 × rate()` mock USDT, approves the token and wraps to the caller. A non-empty nickname is saved too. Blocked while paused. |
| `setNickname(nickname)`                                                                                                                                                             | 3 to 20 characters: letters, digits, single spaces, `_`, `-`. Works while paused.                                                                              |
| `claimWithAvatar(nickname, avatar)`                                                                                                                                                 | The first-visit move, added in 1.1.0: the same daily claim as `claim`, which also saves a preset face from 1 to 12. Blocked while paused.                      |
| `setAvatar(avatar)`                                                                                                                                                                 | A preset face, 1 to 12. Clears an uploaded picture. Works while paused.                                                                                        |
| `setAvatarImage(image)`                                                                                                                                                             | An uploaded picture's IPFS content id: 1 to 100 letters and digits. Clears the preset. Works while paused.                                                     |
| `nicknameOf(player)`, `nextClaimAt(player)`, `avatarOf(player)` (preset, image; `0, ""` when none was chosen), `CLAIM_CHIPS`, `CLAIM_INTERVAL`, `chips()`, `dollars()`, `version()` | Views.                                                                                                                                                         |

Events: `ChipsClaimed`, `NicknameSet`, `AvatarSet`. Errors: `ClaimTooSoon`, `InvalidNickname`, `InvalidAvatar`, `InvalidAvatarImage`, `ZeroAddress`. Version 1.1.0 adds avatars; its storage only appends to `bluff.storage.ChipFaucet`.

## BluffInvites

Keeps strangers out of private tables without ever revealing the code ([ADR-2026-11-13-private-tables-and-table-ids](adr/ADR-2026-11-13-private-tables-and-table-ids.md)).

| Function                                      | Caller       | Allowed when                                                      | Does                                                                                                                                                                            |
| --------------------------------------------- | ------------ | ----------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `newCode(id, host)`                           | `Bluff` only | always, even paused, so tables can be made                        | Makes the table's code with `FHE.randEuint64()`, lets the host read it, and counts the host as invited.                                                                         |
| `tryCode(id, guess, proof)`                   | anyone       | the table has a code, not invited, not paused, fewer than 3 tries | Compares the encrypted guess with the code using `FHE.eq` and makes only that true-or-false answer publicly decryptable. A new try replaces the last.                           |
| `confirmCode(id, player, clearValues, proof)` | anyone       | an attempt is waiting, not paused                                 | Checks the reveal with `FHE.checkSignatures`, then clears the attempt. True: invites the player and lets them read the code, so they can invite others. False: turns them away. |

Views: `isInvited(id, player)`, `codeOf(id)`, `attemptOf(id, player)`, `triesOf(id, player)`, `bluff()`, `version()`, `MAX_TRIES` (3). Events: `CodeCreated`, `CodeTried`, `Invited`, `CodeRejected`. Errors: `NotBluff`, `NoCode`, `AlreadyInvited`, `TooManyTries`, `NoAttempt`, `ZeroAddress`.

## Encrypted values and who can read them

| Value              | Type      | Created by                                        | Readable by                                          |
| ------------------ | --------- | ------------------------------------------------- | ---------------------------------------------------- |
| A die              | `euint8`  | `FHE.rem(FHE.randEuint16(), 6)`; face = value + 1 | `Bluff` and the die's owner; everyone after a call   |
| A payment          | `euint64` | `select(paidInFull, amount, 0)`                   | the cashier and the payer                            |
| Paid in full       | `ebool`   | `FHE.eq(amount, buyIn)`                           | the cashier and the payer; everyone during the check |
| A pot              | `euint64` | sum of payments                                   | the cashier only                                     |
| A balance          | `euint64` | the chip token                                    | its owner only                                       |
| A payout or refund | `euint64` | `div` and `rem` of the pot, or a payment          | its recipient                                        |
| An invite code     | `euint64` | `FHE.randEuint64()`                               | `BluffInvites`, the host, and each invited player    |
| An invite attempt  | `ebool`   | `FHE.eq(code, guess)`                             | `BluffInvites`; everyone, as true or false only      |

The owner cannot read any of these. `confidentiality.test.ts` proves the game's rows, and `invites.test.ts` the invite rows, against the owner, other players and outsiders.

## Limits

| Contract                    | Bytecode | Under the 24,576-byte limit |
| --------------------------- | -------- | --------------------------- |
| `Bluff` (50 optimizer runs) | 23,632   | 944                         |
| `BluffCashier`              | 9,524    | 15,052                      |
| `BluffInvites`              | 8,799    | 15,777                      |
| `ChipFaucet`                | 8,433    | 16,143                      |

Zama's per-transaction encryption limits are 20,000,000 HCU in total and 5,000,000 HCU along any dependency chain. The FHEVM mock enforces both, which `limits.test.ts` proves: `HCUTransactionDepthLimitExceeded` at 16 chained 64-bit multiplications, and `HCUTransactionLimitExceeded` at 40 independent ones. Every test runs under that mock, including:

- a 9-dice roll
- a 4-way payout with a remainder
- eight seeded random games

So every action stays within budget.

## Owner powers

The owner can upgrade, pause, link the cashier and the invites contract once each, and hand ownership over in two steps. Nothing else:

- **No chips.** The owner cannot move chips, end or change a game, invite anyone, or read any encrypted value.
- **Pausing is narrow.** A pause stops only new tables, joins and chip claims. Leaving, moves, timeouts, reveals, settlement, refunds and payouts always work.
- **Upgrades are public.** Every upgrade is a public transaction and changes `version()`. After the competition, ownership moves to a timelock or upgrades are frozen ([ADR-2026-11-11-upgradeable-contracts-and-security](adr/ADR-2026-11-11-upgradeable-contracts-and-security.md)).

## On Sepolia

Every proxy and implementation is verified on Etherscan, so its source is readable and the proxy pages offer "Read as Proxy" and "Write as Proxy".

| Contract       | Proxy                                                                                                 | Implementation                                                                                                |
| -------------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------- |
| `Bluff`        | [`0x46B6…E23e`](https://sepolia.etherscan.io/address/0x46B6D765E3F12cB72F6d50f86ea57C436D4AE23e#code) | [`0xCbC9…2b32`](https://sepolia.etherscan.io/address/0xCbC9448B8eC8F5c00216c4686628CBf0bf232b32#code) (1.2.0) |
| `BluffCashier` | [`0x4837…5EEe`](https://sepolia.etherscan.io/address/0x4837497FEf56758e1bE765062a1504303bDC5EEe#code) | [`0xA10e…c322`](https://sepolia.etherscan.io/address/0xA10e003BfE989b4651602BC310208461bF96c322#code)         |
| `BluffInvites` | [`0x5bAC…F140`](https://sepolia.etherscan.io/address/0x5bACDa7BACa6f67754122F49b59B404471C3F140#code) | [`0x7a96…975B`](https://sepolia.etherscan.io/address/0x7a9637Be08c5E8002B38db785F3F4DE0F809975B#code) (1.0.0) |
| `ChipFaucet`   | [`0xfdB7…A2DC`](https://sepolia.etherscan.io/address/0xfdB752Cc6cCaDc15fD858E8d8011B1dd75f2A2DC#code) | [`0xc027…49ac`](https://sepolia.etherscan.io/address/0xc0276c42C793F86c7ad4e6a5aD91E5C9F8eF49ac#code) (1.1.0) |

The deploy and upgrade tasks verify each new implementation when `ETHERSCAN_API_KEY` is set (`npx hardhat vars set ETHERSCAN_API_KEY`). They name the contract explicitly because the bytecode carries no metadata hash (`bytecodeHash: "none"`), which leaves the verifier unable to match it on its own.

Measured by `test/sepolia/full-game.ts` over the public RPC, in seconds per step, including confirmation:

| Step                                  | Seconds       |
| ------------------------------------- | ------------- |
| Create a free table                   | 6–12          |
| Join and roll                         | 12–13         |
| Read your own dice                    | 4–6           |
| Bid                                   | 4–12          |
| Call a bluff                          | 12–13         |
| Public reveal, then settle            | 5–8, 14–16    |
| Pay and join a paid table             | 11–23         |
| Payment check: reveal, then confirm   | 4–5, 6–8      |
| Leave, ending the game and paying out | 11–12         |
| Create a private table                | 11            |
| Host reads the invite code            | 5             |
| Prove an invite: try, reveal, confirm | 13–16, 3–4, 8 |

A public RPC can answer a read, or estimate gas, from a block older than the one the last move landed in. Read at the block of the last receipt, and wait for the node to reach that block before sending the next move. The web app follows the same rule.

## Upgrading

1. Change the contract, keeping storage append-only inside its ERC-7201 struct. Bump `version()`. Add a `reinitializer(n)` only if new state needs setting.
2. Run `pnpm preflight`. CI validates the new layout against the deployed one.
3. Run `pnpm --filter @bluff/contracts upgrade:sepolia --contract <Bluff|BluffCashier|BluffInvites|ChipFaucet>`. It refuses an unsafe layout, records the new implementation and verifies it on Etherscan.
4. Commit `deployments/sepolia.json` and `.openzeppelin/sepolia.json`, with a release note.

## Accepted static analysis findings

Slither runs on every pull request and fails on medium or higher. These lower findings are accepted:

| Finding                   | Where                                               | Why it is accepted                                                                       |
| ------------------------- | --------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `assembly`                | every `_get…Storage()`                              | The ERC-7201 accessor needs it; it is the only assembly allowed.                         |
| `timestamp`               | deadlines, the faucet                               | Limits are 45 seconds or more; block producers can shift time by seconds.                |
| `reentrancy-events`       | `settleReveal`, `confirmSeats`                      | The external call is Zama's KMS verifier, which is the check itself and must come first. |
| `calls-loop`              | refunds and payouts                                 | At most 4 iterations, calling only our own cashier and the chip token.                   |
| `unindexed-event-address` | OpenZeppelin's `Paused`, `Unpaused`, `AdminChanged` | Inherited events, not ours.                                                              |
