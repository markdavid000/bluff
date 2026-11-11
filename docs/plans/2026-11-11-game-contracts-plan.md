# Game contracts plan

## 1. Scope

The Solidity contracts that run Bluff: tables, rounds, bids, calls, reveals, timeouts, leaving, the end of the game, payouts, practice chips and nicknames, deployed as upgradeable proxies. Web integration is a separate plan.

Implements these ADRs:

- [Game rules](../adr/ADR-2026-11-10-game-rules.md) (approved)
- [Game flow and timing](../adr/ADR-2026-11-10-game-flow-and-timing.md) (approved)
- [Chips and buy-ins](../adr/ADR-2026-11-11-chips-and-buy-ins.md) (approved)
- [Upgradeable contracts and security model](../adr/ADR-2026-11-11-upgradeable-contracts-and-security.md) (approved)

Out of scope: exporting ABIs and addresses to the web app (done with the first web feature that reads the contracts), and the Privy spike's throwaway contract.

## 2. Files

All under `packages/contracts/`. Names follow OpenZeppelin's conventions: contracts in PascalCase, one per file; `interfaces/` for `I`-prefixed interfaces; `libraries/` for pure logic; `mocks/` for contracts that exist only for tests.

```
packages/contracts/
├── contracts/
│   ├── Bluff.sol                       the game, UUPS upgradeable
│   ├── ChipFaucet.sol                  daily practice chips and nicknames, UUPS upgradeable
│   ├── interfaces/
│   │   ├── IBluff.sol                  enums, view structs, events, errors, external functions
│   │   ├── IChipFaucet.sol             events, errors, external functions
│   │   └── IMintableERC20.sol          mint(address,uint256) of the mock USDT
│   ├── libraries/
│   │   ├── BidRules.sol                valid face, valid quantity, "is this bid higher"
│   │   ├── TableRules.sol              seat counts, dice per seat count, buy-in options, time limits
│   │   └── NicknameRules.sol           length and allowed characters
│   └── mocks/
│       ├── MockUSDT.sol                ERC-20 with public mint, standing in for Zama's mock USDT
│       ├── MockConfidentialUSDT.sol    ERC7984ERC20Wrapper over MockUSDT, standing in for cUSDTMock
│       ├── RulesHarness.sol            exposes the libraries to tests
│       └── BluffV2Mock.sol             a second Bluff version, for upgrade tests only
├── tasks/
│   ├── accounts.ts                     existing
│   ├── deploy.ts                       deploys both proxies, writes deployments/<network>.json, verifies on Etherscan
│   └── upgrade.ts                      validates and upgrades one proxy, records the new implementation
├── config/
│   └── networks.ts                     chip token and mock USDT addresses per network
├── deployments/
│   └── sepolia.json                    proxy and implementation addresses, version, block
└── test/
    ├── fixtures.ts                     deploys mocks and both proxies; returns signers and contracts
    ├── helpers/
    │   ├── dice.ts                     decrypt a player's dice; build reveals with the plugin's publicDecrypt
    │   ├── chips.ts                    claim, pay-and-join, read a decrypted balance
    │   └── time.ts                     move past deadlines
    ├── unit/                           one file per area, section 7
    └── sepolia/
        └── full-game.ts                real games on Sepolia, run on demand
```

Other files that change:

| File                                                    | Change                                                                                                                                     |
| ------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `hardhat.config.ts`                                     | Import `@openzeppelin/hardhat-upgrades`; remove `hardhat-deploy`, `namedAccounts` and the deploy folder                                    |
| `package.json`                                          | Packages below; `lint:sol` back to plain `solhint`; `deploy:sepolia` and `upgrade:sepolia` call the tasks; `coverage` enforces thresholds  |
| `.solcover.js`                                          | Skip `mocks/`                                                                                                                              |
| `.solhint.json`                                         | Add `immutable-vars-naming`, `gas-custom-errors`, `no-unused-import`, `ordering`, `private-vars-leading-underscore`                        |
| `knip.json`                                             | Entries for `tasks/**` and `test/**`                                                                                                       |
| `scripts/check-comments.mjs` (root)                     | Allow `/// @custom:storage-location erc7201:<id>` and `/// @custom:oz-upgrades-unsafe-allow constructor`                                   |
| `.github/workflows/ci.yml` (root)                       | Slither job, coverage gate, storage-layout validation; `quality` waits for them                                                            |
| `docs/contracts.md` (root docs)                         | New: the contract reference (functions, events, errors, owner powers, upgrade runbook, accepted Slither findings), standing in for NatSpec |
| `docs/architecture.md`, `docs/engineering-standards.md` | The contracts layout above; upgradeable-storage rules; the two allowed annotations                                                         |

Packages, exact versions, each added with its first user:

| Package                                    | Version | Why                                                                                  |
| ------------------------------------------ | ------- | ------------------------------------------------------------------------------------ |
| `@openzeppelin/confidential-contracts`     | 0.5.3   | `IERC7984`, `IERC7984Receiver`; `ERC7984ERC20Wrapper` for the mock                   |
| `@openzeppelin/contracts`                  | 5.7.0   | Peer; `ERC20` for `MockUSDT`; `ReentrancyGuardTransient`                             |
| `@openzeppelin/contracts-upgradeable`      | 5.7.0   | `UUPSUpgradeable`, `Ownable2StepUpgradeable`, `PausableUpgradeable`, `Initializable` |
| `@openzeppelin/hardhat-upgrades`           | 3.9.1   | Proxy deploys, upgrades and storage-layout validation                                |
| `@nomicfoundation/hardhat-network-helpers` | 1.1.2   | Moving time in timeout tests                                                         |
| `@types/mocha`                             | 10.0.10 | Types for the test files                                                             |

Removed: `hardhat-deploy`.

## 3. Contract structure

### Inheritance

```
Bluff      is IBluff, IERC7984Receiver, Initializable, UUPSUpgradeable,
              Ownable2StepUpgradeable, PausableUpgradeable, ReentrancyGuardTransient
ChipFaucet is IChipFaucet, Initializable, UUPSUpgradeable,
              Ownable2StepUpgradeable, PausableUpgradeable, ReentrancyGuardTransient
```

Neither inherits `ZamaEthereumConfig`, whose constructor would only configure the implementation. Each `initialize` calls `FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig())` instead.

### Layout inside each contract

In this order, as the engineering standards require: `using` statements, constants, the ERC-7201 storage struct and its slot, the constructor (`_disableInitializers()`), `initialize`, external functions (player actions, then anyone-can-call actions, then the token callback, then owner functions), external views, internal functions, private functions, `_authorizeUpgrade` last.

### Types (in `IBluff`)

```solidity
enum TableStatus {
  None,
  Waiting,
  Verifying,
  Playing,
  Revealing,
  Finished,
  Cancelled
}

enum EndReason {
  LastPlayerStanding,
  ClockExpired,
  OthersLeft,
  StuckReveal
}

enum JoinAction {
  Create,
  Join
}

struct TableView {
  uint256 id;
  address host;
  TableStatus status;
  bool isPrivate;
  uint8 seatCount;
  uint8 playerCount;
  uint8 dicePerPlayer;
  uint8 diceInPlay;
  uint64 buyIn;
  uint64 createdAt;
  uint64 startedAt;
  uint64 deadline;
  uint32 round;
  uint8 turn;
  uint8 roundStarter;
  uint8 bidQuantity;
  uint8 bidFace;
  uint8 bidder;
}

struct SeatView {
  address player;
  uint8 dice;
  uint8 missedTurns;
  bool isActive;
}
```

`TableStatus.None` makes an unknown id distinguishable from a real table. `deadline` means the lobby expiry while `Waiting`, the verification or reveal limit while `Verifying` or `Revealing`, and the turn limit while `Playing`.

### Storage (ERC-7201, `bluff.storage.Bluff`)

```solidity
struct Table {
  address host;
  TableStatus status;
  bool isPrivate;
  uint8 seatCount;
  uint8 playerCount;
  uint8 dicePerPlayer;
  uint8 diceInPlay;
  uint8 turn;
  uint8 roundStarter;
  uint8 bidQuantity;
  uint8 bidFace;
  uint8 bidder;
  uint32 round;
  uint64 buyIn;
  uint64 createdAt;
  uint64 startedAt;
  uint64 deadline;
  euint64 pot;
}

struct Seat {
  address player;
  uint8 dice;
  uint8 missedTurns;
  bool isActive;
  euint64 paid;
  ebool paidInFull;
  euint8[] currentDice;
}

struct BluffStorage {
  IERC7984 chips;
  uint256 nextTableId;
  mapping(uint256 tableId => Table) tables;
  mapping(uint256 tableId => Seat[]) seats;
  mapping(address player => uint256 tableId) tableOf;
  EnumerableSet.UintSet openTables;
}
```

Fields are ordered so a table's clear values pack into three storage slots. Only the current round's dice are stored; each settlement overwrites them, and the revealed values are kept in the `RoundSettled` event.

`ChipFaucet` storage (`bluff.storage.ChipFaucet`): the chip token, the mock USDT, `mapping(address => string) nicknames`, `mapping(address => uint64) nextClaimAt`.

### Constants (`TableRules`)

| Constant                    | Value                                                              |
| --------------------------- | ------------------------------------------------------------------ |
| Seat counts                 | 2, 3, 4                                                            |
| Dice per player             | 4, 3, 2 for 2, 3, 4 seats                                          |
| Buy-in options              | 0, 10, 25, 50 chips; chips have 6 decimals                         |
| Lobby limit                 | 10 minutes                                                         |
| Turn limit (enforced)       | 45 seconds                                                         |
| Seat verification limit     | 10 minutes                                                         |
| Stuck reveal limit          | 10 minutes                                                         |
| Game clock                  | 15 minutes                                                         |
| Missed turns before removal | 2                                                                  |
| Faucet claim                | 100 chips every 24 hours                                           |
| Nickname                    | 3 to 20 bytes: `A` to `Z`, `a` to `z`, `0` to `9`, space, `_`, `-` |

## 4. Interfaces

### Bluff: player and public actions

| Function                                                       | Who            | When                             | Does                                                                                                         |
| -------------------------------------------------------------- | -------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `createFreeTable(uint8 seatCount, bool isPrivate) → id`        | anyone         | not at a table, not paused       | Creates a free table; the creator takes seat 0                                                               |
| `joinFreeTable(uint256 id)`                                    | anyone         | `Waiting`, seat free, not paused | Takes the next seat; filling the last seat starts the table                                                  |
| `onConfidentialTransferReceived(operator, from, amount, data)` | the chip token | not paused                       | Paid create or join, decoded from `data` as `(JoinAction, seatCount or id, isPrivate)`; returns `paidInFull` |
| `startTable(uint256 id)`                                       | host           | `Waiting`, 2+ players            | Starts: `Verifying` for paid tables, the first roll for free ones                                            |
| `leaveTable(uint256 id)`                                       | seated player  | any open status                  | Refund while waiting or verifying; forfeit in a game                                                         |
| `cancelTable(uint256 id)`                                      | seated player  | `Waiting`, lobby expired         | Cancels and refunds everyone                                                                                 |
| `confirmSeats(uint256 id, bytes clearValues, bytes proof)`     | anyone         | `Verifying`                      | Verifies the paid flags; removes unpaid seats and returns to waiting, or rolls round 1                       |
| `cancelVerification(uint256 id)`                               | anyone         | `Verifying`, limit passed        | Cancels and refunds what each player actually paid                                                           |
| `placeBid(uint256 id, uint8 quantity, uint8 face)`             | player on turn | `Playing`                        | Raises                                                                                                       |
| `callBluff(uint256 id)`                                        | player on turn | `Playing`, a bid exists          | Makes the round's dice public; `Revealing`                                                                   |
| `settleReveal(uint256 id, bytes clearValues, bytes proof)`     | anyone         | `Revealing`                      | Verifies, counts, removes a die; rolls the next round or ends the game                                       |
| `claimTimeout(uint256 id)`                                     | anyone         | `Playing`, deadline passed       | The idle player loses a die; a second miss removes them; the next round rolls                                |
| `cancelStuckReveal(uint256 id)`                                | anyone         | `Revealing`, limit passed        | Ends the game, sharing the pot among players still in it                                                     |

Pausing blocks only the creates, joins and the callback. Everything else always works.

### Bluff: owner

`pause()`, `unpause()`, `upgradeToAndCall(...)` (from UUPS, guarded by `_authorizeUpgrade`), `transferOwnership` / `acceptOwnership` (two-step).

### Bluff: views

| Function                                                  | Returns                                                                        |
| --------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `getTable(uint256 id) → (TableView, SeatView[])`          | Everything a screen needs in one call                                          |
| `openTables(uint256 offset, uint256 limit) → TableView[]` | Public tables waiting for players, for the lobby, paginated                    |
| `openTableCount() → uint256`                              |                                                                                |
| `tableOf(address player) → uint256`                       | The player's table, or 0                                                       |
| `diceOf(uint256 id, address player) → euint8[]`           | Handles of the player's current dice; only they can decrypt them               |
| `paymentOf(uint256 id, address player) → euint64`         | Handle of what they paid; only they can decrypt it                             |
| `revealHandles(uint256 id) → bytes32[]`                   | The handles to public-decrypt, in the order the next confirm or settle expects |
| `chips() → address`, `version() → string`                 |                                                                                |

### ChipFaucet

| Function                                   | Does                                                                            |
| ------------------------------------------ | ------------------------------------------------------------------------------- |
| `claim(string nickname)`                   | Mints 100 mock USDT and wraps it to the caller; saves the nickname if not empty |
| `setNickname(string nickname)`             | Changes the nickname                                                            |
| `nicknameOf(address player) → string`      |                                                                                 |
| `nextClaimAt(address player) → uint64`     |                                                                                 |
| `pause()`, `unpause()`, upgrade, ownership | Owner                                                                           |
| `version() → string`                       |                                                                                 |

### Events

`id` and player addresses are `indexed`, so the web app can filter by table and by player.

| Contract   | Event                                                                                                          |
| ---------- | -------------------------------------------------------------------------------------------------------------- |
| Bluff      | `TableCreated(id, host, seatCount, dicePerPlayer, buyIn, isPrivate)`                                           |
| Bluff      | `PlayerJoined(id, player, seat)`, `PlayerLeft(id, player, refunded)`, `HostChanged(id, host)`                  |
| Bluff      | `TableCancelled(id)`, `SeatVerificationStarted(id, deadline)`, `SeatRemoved(id, player)`                       |
| Bluff      | `GameStarted(id, startedAt, clockEndsAt)`, `RoundStarted(id, round, starter, deadline)`                        |
| Bluff      | `BidPlaced(id, round, player, quantity, face, nextTurn, deadline)`, `BluffCalled(id, round, caller, deadline)` |
| Bluff      | `RoundSettled(id, round, face, quantity, count, loser, revealedDice)`                                          |
| Bluff      | `TurnTimedOut(id, player)`, `PlayerEliminated(id, player)`, `GameEnded(id, reason, winners)`                   |
| ChipFaucet | `ChipsClaimed(player, nextClaimAt)`, `NicknameSet(player, nickname)`                                           |

Paused, unpaused, upgraded, initialized and ownership events come from OpenZeppelin.

### Errors

Errors carry the values the web app needs to explain them.

- **Bluff:** `TableNotFound(id)`, `WrongStatus(id, status)`, `TableFull(id)`, `AlreadyAtTable(tableId)`, `NotAtTable(id)`, `NotHost(id)`, `NotEnoughPlayers(id)`, `InvalidSeatCount(seatCount)`, `InvalidBuyIn(buyIn)`, `NotYourTurn(id, turn)`, `NoBidToCall(id)`, `InvalidFace(face)`, `QuantityTooHigh(quantity, diceInPlay)`, `BidNotHigher(quantity, face, currentQuantity, currentFace)`, `DeadlineNotPassed(deadline)`, `UnauthorizedCallback(caller)`, `InvalidCallbackData()`.
- **ChipFaucet:** `ClaimTooSoon(nextClaimAt)`, `InvalidNickname()`.

## 5. Encrypted values and who can read them

| Value          | Created by                                                                           | Readable by                                                                              |
| -------------- | ------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------------------- |
| A die          | `FHE.rem(FHE.randEuint16(), 6)`, cast to `euint8`; face = value + 1                  | the contract and the die's owner; everyone after a call                                  |
| `paid`         | `FHE.select(paidInFull, amount, 0)`: what was kept after the token's refund decision | the contract and the player                                                              |
| `paidInFull`   | `FHE.eq(amount, buyIn)`                                                              | the contract, the token (transiently, to decide the refund); everyone during `Verifying` |
| `pot`          | sum of every seat's `paid`                                                           | the contract                                                                             |
| Payout, refund | `paid`, `pot`, `FHE.div(pot, n)`, `FHE.rem(pot, n)`                                  | the contract; the chip token transiently                                                 |

Dice stay `0` to `5` encrypted, saving one operation per die. The modulo bias is 4 in 65,536.

Rolls happen inside transactions anyone can send (settle, timeout, confirm). Reverting and resending a roll gives no advantage, because nobody can see the result.

## 6. Flows

### A round

```
roll (startTable, confirmSeats, settleReveal, claimTimeout)
  └─ for each active seat, for each die: rem(randEuint16, 6) → allowThis, allow(owner)
placeBid ─► deadline = now + 45 s, turn = next active seat
callBluff ─► makePubliclyDecryptable(every current die) ─► Revealing, deadline = now + 10 min
settleReveal(clearValues, proof)
  └─ checkSignatures(revealHandles, clearValues, proof)
  └─ count dice equal to the bid face or 1 ─► the loser loses a die (a player who left loses nothing more)
  └─ clock out, or one active player ? end : roll the next round
```

`confirmSeats` and `settleReveal` move the status on, so a second submission reverts with `WrongStatus`.

### Ending and payouts

- One winner gets the whole pot with `confidentialTransfer`. A plain transfer does not call the receiver, so a winner's wallet cannot block the payout.
- Tied winners each get `FHE.div(pot, n)`; the first to have joined also gets `FHE.rem(pot, n)`.
- A stuck reveal splits the same way among players still in the game.
- `tableOf` is cleared for every player on every exit: leave, removal, cancel, end.

## 7. Security review

Checked against common smart contract weaknesses and against what is specific to FHE.

| Area                     | Risk                                                                                | Handling                                                                                                     |
| ------------------------ | ----------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Reentrancy               | The chip token is an upgradeable proxy we do not control                            | `nonReentrant` on every function that calls it; checks, effects, interactions                                |
| Callback spoofing        | Anyone could call `onConfidentialTransferReceived` claiming to have paid            | Only the configured chip token is accepted; the amount comes from the token, never from data                 |
| Double refund            | Refunding manually and returning false refunds twice                                | The callback never refunds; it only returns `paidInFull`                                                     |
| Paying nothing           | Transfers move 0 when the balance is short                                          | Seat verification before the first roll                                                                      |
| Standing approvals       | An operator approval lets the game move a player's chips later                      | Pay-and-join; the game never holds an approval                                                               |
| Reveal forgery or replay | A fake or reused reveal could fix a round                                           | Handles come from storage, in a fixed order; `checkSignatures` binds them; status changes once               |
| Information leaks        | Access granted too widely; branching on encrypted values; reveals at the wrong time | Grants listed in section 5 and tested; no branching on encrypted values; dice public only after a call       |
| Stuck games              | A player, the relayer or a lobby can stall a table                                  | Every waiting status has a deadline anyone can enforce                                                       |
| Denial of service        | Unbounded loops; a payout that reverts                                              | At most 4 seats and 9 dice; payouts use plain transfers                                                      |
| Admin abuse              | Owner pauses to trap chips, or upgrades to cheat                                    | Pause cannot stop exits or games; owner powers limited and disclosed; upgrades public, later timelocked      |
| Upgrade mistakes         | Storage collisions, re-initialisation, an uninitialised implementation              | ERC-7201 storage, `_disableInitializers`, `initializer`, layout validation in CI                             |
| Front-running            | Racing to fill a seat; reading a private table's id                                 | Harmless for seats. Private tables are unlisted, not secret: anyone with the id can join. Stated in the app. |
| Timestamps               | Block producers shift time by seconds                                               | Limits are 45 seconds or more                                                                                |
| Wallet types             | `tx.origin` breaks smart accounts and sponsored transactions                        | Never used                                                                                                   |
| Nicknames                | Look-alike or hidden characters used to impersonate                                 | Letters, digits, space, `_` and `-` only; the app renders them as text                                       |
| Faucet abuse             | Many accounts claiming chips                                                        | Practice chips have no value; accepted                                                                       |
| Collusion                | One person playing several seats                                                    | Not preventable at this stage; stated as a known limit                                                       |

## 8. Scalability

- No function loops over tables or players beyond the one table it acts on, so cost per move does not grow with the number of games.
- The lobby reads `openTables` with pagination. A public table is added when created and removed when it starts or closes, both in constant time.
- Each table is independent: games never contend with each other.
- Only the current round's dice are stored. History lives in events, so storage per table stays small.
- The web app reads one table with one call (`getTable`) and follows it through events filtered by `id`. A production RPC provider is needed for event history; public Sepolia endpoints limit log queries.

## 9. Wording

The contracts show no text to players. Each custom error and event becomes a `copy.ts` string in the web plan.

## 10. Tests

All in `test/unit/`, against the FHEVM mock, with a fresh fixture per test. File names end in `.test.ts`.

| File                        | Proves                                                                                                                                                                                         |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `rules.test.ts`             | Dice per seat count; faces 2 to 6; the quantity limit; every case of "is higher"; nickname rules                                                                                               |
| `tables.test.ts`            | Create and join, free and paid; host start; start when full; every refusal: seat count, buy-in, full, second table, not host, one player, unknown id                                           |
| `waiting-room.test.ts`      | Leave refunds exactly; the host passes on; the last player leaving closes the table; cancel only after 10 minutes; cancel refunds everyone; the open-tables list stays correct                 |
| `callback.test.ts`          | Only the chip token can call back; bad data reverts; a short amount is refunded by the token; an exact amount seats the player                                                                 |
| `seat-verification.test.ts` | Paid tables verify; an unpaid seat is removed and the table reopens; all paid rolls round 1; replayed confirmation reverts; verification can be cancelled after its limit with exact refunds   |
| `rounds.test.ts`            | Each active player gets the right dice; values decrypt to 0 to 5; the host starts round 1; the loser starts the next; an eliminated loser passes the start on                                  |
| `bidding.test.ts`           | Turn order with players out; only the player on turn bids; every bid error; the 45-second deadline; a maximal bid leaves only a call                                                           |
| `reveal.test.ts`            | No call before a bid; dice public only after a call; both outcomes; ones wild; a wrong proof reverts; a second settlement reverts; revealed dice are in the event                              |
| `timeouts.test.ts`          | No claim before the deadline; a timeout costs a die and starts a new round; a second miss removes the player; the clock ends the game after the current round; a stuck reveal can be cancelled |
| `leaving.test.ts`           | Leaving mid-game forfeits and passes the turn; leaving during a reveal still counts the dice; the last remaining player wins at once; `tableOf` cleared on every exit                          |
| `payouts.test.ts`           | One winner gets the whole pot; ties split with the remainder to the first-joined; a stuck reveal splits among remaining players; checked by decrypting balances                                |
| `faucet.test.ts`            | A claim gives exactly 100 chips; a second claim within 24 hours reverts with the next time; nickname rules and updates                                                                         |
| `confidentiality.test.ts`   | Others cannot decrypt your dice, payment or balance; dice are not public before a call; no grant beyond section 5                                                                              |
| `admin.test.ts`             | Pause blocks only creates, joins, the callback and claims; only the owner pauses and upgrades; ownership moves in two steps                                                                    |
| `upgrade.test.ts`           | `initialize` runs once and never on the implementation; an upgrade to `BluffV2Mock` keeps tables and lets a player decrypt dice stored before it; `version()` changes                          |
| `invariants.test.ts`        | Seeded random games with every action: `tableOf` matches seats; dice never go negative; chips in equals chips out (paid = payouts + refunds); every game ends                                  |
| `limits.test.ts`            | Each implementation's bytecode is under 24,576 bytes; the HCU of a 9-dice roll, a paid join and a settlement that rolls is recorded and under the limit                                        |

`test/sepolia/full-game.ts` plays a 2-player free game and a 2-player paid game on Sepolia with real cUSDT, recording each step's time against the game flow ADR's estimates.

Coverage gate: at least 95% of lines and 90% of branches in `contracts/` outside `mocks/`.

## 11. Removal

- `hardhat-deploy`, its config and the empty `deploy/` convention, replaced by the deploy and upgrade tasks.
- The temporary `lint:sol` guard for an empty `contracts/` folder.

## 12. Build order

Each step is its own pull request into `dev`, test-first:

1. Tooling: packages, upgrades plugin, comment-checker annotations, Slither and coverage jobs in CI, fixtures and helpers, libraries and `rules.test.ts`.
2. Upgradeable skeletons of both contracts with initialisation, pause and upgrade: `admin.test.ts`, `upgrade.test.ts`.
3. Free tables and the waiting room: `tables.test.ts`, `waiting-room.test.ts`.
4. Rolling and bidding: `rounds.test.ts`, `bidding.test.ts`.
5. Calls and reveals: `reveal.test.ts`.
6. Timeouts, leaving, the clock and the end of the game: `timeouts.test.ts`, `leaving.test.ts`.
7. Chips: faucet, paid tables, callback, verification, payouts: `faucet.test.ts`, `callback.test.ts`, `seat-verification.test.ts`, `payouts.test.ts`.
8. Hardening: `confidentiality.test.ts`, `invariants.test.ts`, `limits.test.ts`, `docs/contracts.md`, the deploy and upgrade tasks, the Sepolia deploy and `full-game.ts`.

If `limits.test.ts` shows `Bluff` near the size limit at step 6, the chip handling moves into a separate `BluffCashier` contract before step 7, recorded in its own ADR.

## 13. Before the Sepolia deploy

- Read `cUSDTMock`'s live ABI on Etherscan (it is a proxy) and confirm `confidentialTransferAndCall`, `wrap`, `rate` and `decimals`.
- Confirm the mock USDT's `mint` is still public.
- Deploy from a dedicated deployer key that holds only Sepolia ETH.
- Verify both implementations on Etherscan.
- Record measured HCU, gas and game times in the step 8 pull request.

## A note on NatSpec

Industry practice documents every external function with NatSpec. This repository bans comments, so `docs/contracts.md` carries the same reference: purpose, parameters, events, errors and access for every external function. The two annotations the upgrade tooling reads are the only exceptions.
