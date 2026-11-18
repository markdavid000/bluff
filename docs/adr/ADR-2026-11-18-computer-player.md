# ADR-2026-11-18: The computer player, revised

- **Status:** Approved
- **Approved by:** the maintainer, 2026-11-18, in chat
- **Companion:** [ADR-2026-11-18-computer-player-for-dummies.md](ADR-2026-11-18-computer-player-for-dummies.md)
- **Supersedes:** [ADR-2026-11-11-computer-player](ADR-2026-11-11-computer-player.md). Its core holds: an ordinary seat with its own wallet, free tables only, a service rather than a browser, and no contract change. This revision fixes two flaws in it and brings it in line with everything built since.
- **Builds on:**
  - [Game flow and timing](ADR-2026-11-10-game-flow-and-timing.md)
  - [The waiting room and ready marks](ADR-2026-11-12-waiting-room-and-ready.md)
  - [Ready again after a reopen](ADR-2026-11-17-ready-again-after-reopen.md)
  - [Back to your game](ADR-2026-11-17-back-to-your-game.md)
- **Plan:** [2026-11-18-computer-player-plan.md](../plans/2026-11-18-computer-player-plan.md)

## Context

### The problem

Bluff needs at least two players. A judge or a new player who opens the game alone sees an empty lobby and never sees a game. A computer opponent lets anyone play at once. It also shows the product's point: the computer plays with hidden dice it can read only through Zama's protocol, and it can't see anyone else's.

### What changed since 2026-11-11

| Area                     | Then                         | Now                                                                    |
| ------------------------ | ---------------------------- | ---------------------------------------------------------------------- |
| Starting a game          | Starts when full             | Host presses Start once every other player is ready (`setReady`)       |
| Reopened paid table      | n/a                          | Every ready mark is cleared (`Bluff` 1.4.0)                            |
| Turn limit               | 30 s on screen, 45 s onchain | **60 s on screen, 75 s onchain** (`TableRules.TURN_LIMIT`)             |
| Nicknames                | Free text                    | **Unique, ignoring letter case** (`ChipFaucet` 1.2.0, `NicknameTaken`) |
| Private tables           | n/a                          | Need an invite proof to join (`BluffInvites`)                          |
| Seated players elsewhere | Free to roam                 | Sent back to their table (`useWelcomeGate`)                            |
| Zama SDK                 | Relayer SDK                  | `@zama-fhe/sdk` 3.7.2, with a dedicated Node entry                     |
| Repository               | Private                      | **Public**; GitHub rulesets on `dev`, `staging` and `main`             |

### Two flaws in the 2026-11-11 design

1. **One wallet can't hold five seats.** `Bluff` keeps one table per address and rejects a second seat with `AlreadyAtTable` (`Bluff.sol`, `_requireNotAtTable`). The earlier "the bot holds fewer than 5 seats" needs one wallet per concurrent table.
2. **"The caller's address is seated there" can't be checked.** `POST /seat` carries no signature, so any address can be claimed. The check gave a false sense of safety, and is replaced below with checks the service can actually verify.

### Facts verified for this decision (2026-11-18)

- **Dice confidentiality, onchain:**
  - `_rollSeat` stores each die with `FHE.allowThis` and `FHE.allow(die, seat.player)`, so only the contract and that seat's address may decrypt it.
  - Dice become public only through `callBluff`, then `FHE.makePubliclyDecryptable`, then `settleReveal`'s `FHE.checkSignatures`.
- **Die values:** stored as `FHE.rem(randEuint16, 6)`, so **0 to 5**. The web app shows `value + 1` (`use-own-dice.ts`), and the computer must do the same.
- **Zama SDK in Node** (the installed `@zama-fhe/sdk` 3.7.2):
  - The `@zama-fhe/sdk/node` export provides `node()`, for Node 22 or later. Encryption runs inline, so there's no Worker or IndexedDB.
  - `createConfig({ relayers: { [sepolia.id]: node() }, walletClient })` with a viem local account signs the EIP-712 permit itself.
  - `sdk.decryption.decryptValues([{ encryptedValue, contractAddress }])` returns the account's own clear values.
  - `sdk.decryption.decryptPublicValues(handles)` returns `abiEncodedClearValues` and `decryptionProof` for `settleReveal`.
  - The Sepolia relayer is `https://relayer.testnet.zama.org`.
  - Not yet run end to end in Node, so it's the first step of the plan.
- **Names:** `ChipFaucet.setNickname` and `setAvatar` need no prior claim. The 24 names in section 3 are free on Sepolia today, and pass the nickname rules (3 to 20 characters, `[A-Za-z0-9 _-]`).
- **`@bluff/contracts` isn't loadable by plain Node.** It's TypeScript source importing JSON without an import attribute (Node raises `ERR_IMPORT_ATTRIBUTE_MISSING`). It works today only through the web app's bundler.
- **Hosting** (official pages, read 2026-11-18):

  | Host        | What it costs                                                           | Sleep and wake                                                                                                          | Problem                             |
  | ----------- | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------- |
  | Railway     | Trial: $5 for 30 days, no card. Hobby: $5/month, including $5 of usage. | Sleeps 5–10 min after the last **outbound** packet; only an inbound request wakes it, and that request may get a `502`. | The trial ends before judging does. |
  | Render free | Free                                                                    | Sleeps after 15 min without **inbound** traffic; waking takes about a minute.                                           | Would sleep mid-game.               |
  | Fly.io      | $1 trial; about $2.55 always-on for the window                          | Auto-stop rules unverified                                                                                              | —                                   |

- **Existing logic the computer needs** (all in `apps/web/src` today):
  - `lib/bid-rules.ts`: legal bids, `countMatching` and quick picks;
  - `lib/bid-odds.ts`: a binomial `bidChance`, with each unknown die matching at probability 1/3;
  - `features/table/lib/table-view.ts`: `toTable`;
  - `features/table/lib/keeper-duty.ts`: who keeps the table moving, and when.

  `bid-rules.ts` takes its `Face` type from `lib/dice-physics.ts` (the 3D dice simulation).

### Requirements

1. **Fair.** The computer reads only its own dice, through the same protocol as any player, and never shows them to anyone.
2. **Honest.** Players always know it's a computer.
3. **Safe for the contracts.** No contract change, upgrade or storage change. It uses only the public functions any player uses.
4. **No effect on chips.** Free tables only.
5. **Live and natural.** It answers in a human-like 2 to 6 s, never misses a turn while the service is healthy, and never stalls a table.
6. **Resilient.** It survives a restart mid-game, a relayer hiccup and a cold start.
7. **Hard to abuse.** Strangers can't drain it, park it, or use it against other players.
8. **Held to project standards:** tests, no comments, knip, `pnpm preflight` and CI, and secrets never in the repository.

## Options considered

### Where the computer runs

| Option                                                                                                                              | Fair?                                            | Contract risk                                                                                                       | Effort and risk               | Verdict                                          |
| ----------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- | ----------------------------- | ------------------------------------------------ |
| **A. In the human's browser**                                                                                                       | No: the browser would hold the computer's dice   | None                                                                                                                | Low                           | Rejected: defeats the point.                     |
| **B. Onchain FHE player:** a `BluffBot` contract seat that chooses moves over its encrypted dice, with keepers relaying decryptions | Yes, and visibly so                              | **High:** a new contract with HCU budgets, coverage of 95% and up, Slither, upgrades, and two transactions per move | Large; well past the deadline | Rejected for now. Recorded as a future showcase. |
| **C. Off-chain service with its own wallets**                                                                                       | Yes: the protocol enforces it, as for any player | **None**                                                                                                            | Medium                        | **Chosen.**                                      |

### Whose wallets the computer players use

| Option                                                                            | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| --------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Wallets derived from the service's own secret phrase, funded by a bank wallet** | **Chosen.** The gas is free Sepolia test ETH, so there is nothing to sponsor. The only secret controls a little test ETH. Moves are signed locally, with no extra round trip, and the Zama SDK takes the viem account directly.                                                                                                                                                                                                                                                                                                                                                                       |
| **Privy server wallets** (`@privy-io/node`, `wallets().create`, `sponsor: true`)  | Rejected (Privy's docs, read 2026-11-18). They can sign EIP-712, but nothing says native gas sponsorship covers server-owned wallets; the docs name only user wallets upgraded by EIP-7702. The service would need **Privy's app secret**, which controls the whole Privy app including players' accounts, so a leak there is far worse than a test-ETH phrase. Every move and permit would go through Privy's API, and sponsored sends return no hash until confirmed, so each move is slower and needs polling. Server-wallet rate limits aren't published, and the Zama SDK would need an adapter. |

### Where the service is hosted

| Option                         | Verdict                                                                                                                                           |
| ------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| Railway Hobby ($5/month)       | **Chosen.** Simple deploys from the repository, environment variables, and sleeps when idle. Start on the trial and move to Hobby before it ends. |
| Fly.io (about $2.55 always-on) | A fallback if Railway fails. Cheaper, more setup.                                                                                                 |
| Render free                    | Rejected: sleeps mid-game, and takes a minute to wake.                                                                                            |
| The maintainer's own computer  | Rejected: unavailable when the laptop sleeps, so it's no good for judges.                                                                         |

## Decision

### 1. Shape

```
packages/game  (@bluff/game)   pure rules shared by web and bot
apps/bot       (@bluff/bot)    Node 24 service: seat requests, play, keeper
apps/web                       "Play the computer" in the lobby; "Play now" renamed "Quick play"; Computer badge
packages/contracts             unchanged
```

### 2. `@bluff/game`, one copy of the rules

- **Moves out of `apps/web`, unchanged in behaviour,** with their tests:
  - `bid-rules.ts`;
  - `bid-odds.ts`;
  - `table-view.ts` (`toTable` and its types);
  - `keeper-duty.ts`.
- **`Face` (1 to 6)** moves with the rules, into `face.ts`, so the package doesn't depend on the 3D dice code. `dice-physics.ts` imports it from there. It keeps its name: `DieFace` was planned, but the app already has a `DieFace` component (`components/shared/die.tsx`), and one file uses both.
- **No copies.** The web app imports these from `@bluff/game`, and the old files are deleted (Directive 6).
- **Pure TypeScript** with Vitest. Its only dependency is `@bluff/contracts`, for ABI-derived types.

### 3. A pool of computer players that grows on demand

A computer player is just a wallet, and one secret phrase (`BOT_MNEMONIC`) derives as many as needed for free (BIP-44 accounts). So nobody is turned away because "the computers are busy":

- **The bank, account 0,** holds the test ETH and never sits down. It's the only wallet the maintainer tops up.
- **Computer players, accounts 1 to 20** (`BOT_MAX_PLAYERS`, default 20):
  - A free, named, funded player sits down at once.
  - If every existing player is busy, the service **brings in the next account**: the bank funds it, it sets its name and face once, then it sits down. That's a few seconds, once, for each new player.
  - Each player has its own seat, nonce and name, so transactions on different tables never share a nonce, and each player sends its moves one at a time.
- **Names,** set onchain the first time each player is used:
  - The list, in order: Baba Dice, Mama Dice, Oga Dice, Iya Dice, Chief Dice, Aunty Dice, Uncle Dice, Bros Dice, Sisi Dice, Mazi Dice, Alhaji Dice, Madam Dice, Prof Dice, Mallam Dice, Captain Dice, Boss Dice, Ada Dice, Emeka Dice, Tunde Dice and Kemi Dice.
  - The spares, in order: Femi Dice, Ngozi Dice, Bayo Dice and Amaka Dice.
  - All 24 are free on Sepolia and valid today (checked 2026-11-18).
  - If a player has taken a name by then, the next unused spare is chosen. `/health` lists the names actually used.
- **Faces:** each player gets a fixed preset face, chosen by its account number.
- **Funding:**
  - The bank tops a player up to 0.02 ETH whenever it drops below 0.01 ETH, before it sits down.
  - If the bank itself is below 0.05 ETH, the service stops seating new games (`409 resting`) and logs that it needs a top-up. Games in progress carry on.
  - The service never handles the deployer's keys.
- **The cap of 20 games at once** is a safety limit, not a design limit. It bounds how much the bank can be spent, and is one setting to raise.

### 4. `POST /seat`: when the computer sits down

The request body is `{ "tableId": "<decimal>" }`. Everything checked is onchain and public, so the request carries no secret and no claimed identity. The service reads `getTable` and seats a free wallet only if:

1. the table exists, is **waiting**, is **free** (`buyIn == 0`) and is **public** (private tables need an invite the computer doesn't have);
2. it is a **2-seat table with exactly one player in it**, the shape Play the computer creates and the only one the computer joins. This also means **one computer per table** and never a computer at a table of strangers;
3. it was created in the last 10 minutes (`createdAt`);
4. a pool wallet is free and funded.

Abuse limits:

- **Per IP:** 5 requests per 10 minutes.
- **Origins:** CORS allows only the `ALLOWED_ORIGINS` list (localhost and the Vercel domains).
- **Parked tables:** a computer leaves a waiting table that hasn't started within **5 minutes** of it sitting down, so nobody can park players for long.
- **Responses:**
  - `202 { seated: "<address>" }` when it sits down;
  - `409 { reason }` for each refusal: `not-waiting`, `not-free`, `private`, `wrong-size`, `full`, `too-old`, `all-busy` (all 20 playing), `resting` (the bank needs a top-up);
  - `429` when rate-limited;
  - `GET /health` returns the wallets' addresses, balances and seats. All of these are public onchain anyway, and it never returns dice.

### 5. Lifecycle of one seat

```
free ──/seat ok──► joining ──PlayerJoined──► waiting(ready) ──GameStarted──► playing ──GameEnded──► free
                      │                         │  host leaves / table cancelled ─────────────────► free
                      │                         └─ not started in 5 min ─► leaveTable ───────────► free
                      └─ join reverted (seat taken) ─────────────────────────────────────────────► free
```

- **After joining,** it marks itself ready (`setReady(true)`). After a reopen, which clears marks in 1.4.0, it readies again.
- **It never leaves a game in progress,** since that forfeits. A game ends by the usual rules: last player standing, the clock, or others leaving.
- **After a restart,** each pool wallet's `tableOf` is read on startup and its seat resumes where it is. The chain is the only source of truth, and there is no database.

### 6. Taking a turn

On its turn (`status == playing` and `seats[turn] == its address`, from a fresh read):

1. **It waits 2 to 6 s,** but acts at once if fewer than 15 s of the 75 s turn are left.
2. **It reads `diceOf(id, itself)`** and decrypts with its own permit. Values 0 to 5 become faces 1 to 6, and anything else is an error, never a guess.
3. **It asks the strategy (section 7)** and sends `placeBid` or `callBluff`.
4. **It sends only if the turn is still its own,** reading again just before sending, as the web keeper does.

If decryption keeps failing, it retries until 15 s before the deadline, then **lets the turn time out** and logs the failure. It never plays without seeing its dice: guessing would be the "fallback data" Directive 4 forbids, and a timeout is the game's own honest penalty.

### 7. Strategy (pure, in `apps/bot/src/strategy.ts`)

The chance that a bid is true is `bidChance(bid, ownFaces, hiddenDice)` from `@bluff/game`, where `hiddenDice = diceInPlay − ownDice`. Each hidden die matches with probability 1/3, since it shows the bid face or a wild one.

- **Opening bid:** the bid with the most dice whose chance is at least 0.5, with a higher face breaking ties. If none qualifies, one of its best face.
- **Facing a bid:**
  - **Call** if its chance is below **0.35**, or if no legal raise exists (the maximal bid).
  - **Never call a bid its own dice already make true** (chance 1).
  - **Always call an impossible bid** (chance 0).
- **Raising:** the legal bid with the highest chance, with the lower bid winning ties.
- **Bluffing:** 15 % of raises use the lowest legal bid on a face it holds none of, if one exists, so it isn't predictable.
- **Settings and randomness:** the thresholds sit in one module. A random source is passed in, so tests can fix it.
- **These numbers steer only the computer.** Players' own "safe" and "risky" hints keep their separate settings in `bid-odds.ts` (0.6 and 0.3), unchanged.

### 8. Keeping tables moving

Every seated computer runs the same duties as a seated browser: `settleReveal`, `claimTimeout`, `cancelStuckReveal` and `cancelTable`. It decides with the shared `keeperDuty`, staggers by seat position, and checks before sending that the duty is still due. It reveals with `decryptPublicValues`, retrying for up to 30 s.

### 9. Staying awake on Railway

- **While any player is seated,** the service polls the chain every 2 s with **one** request for all its tables: `Bluff`'s events since the last block. It reads only the tables those events touch, so 20 games cost about as much RPC as one. Those outbound packets keep Railway from sleeping mid-game.
- **When no wallet is seated,** polling stops. The service sleeps after 5 to 10 minutes, so an idle week costs close to nothing.
- **The first request after sleeping may get a `502`.** The web app retries 3 times over about 20 s, showing "Waking the computer…".

### 10. The web app

- **Lobby buttons:**
  - **Quick play** is today's **Play now**, renamed. Its behaviour doesn't change: it finds a table with people, or creates one. The new name appears everywhere "Play now" does today: the lobby, the empty open-tables list, the empty Your games page and the design page.
  - **Play the computer** is new, and sits beside it. It sets up a game against the computer straight away:
    1. It creates a free, public 2-seat table, using the existing create path and action status.
    2. It calls `POST /seat`.
    3. The player lands in the waiting room with the computer already seated, or arriving within seconds, and **already ready**. The player presses **Start the game**: the normal flow, with nothing new to learn.
    4. If a person happens to take the seat first (`409 full`), the app says so and the game goes ahead with that person.
- **Nothing new in the waiting room.** The computer only sits down through Play the computer.
- **Computer badge:** shown on every seat whose address is in `config/computer-players.ts`. It's also shown in Your games and the game details.
- **Plain-language messages** for each refusal and for a sleeping service, as toasts, in `copy.ts`. For example: "The computer is busy with other games. Try again in a minute."
- **Configuration:** `NEXT_PUBLIC_BOT_URL` holds the service's public address. It isn't a secret.

### 11. Building and running

- **Build:** the bot is bundled with `esbuild` into `dist/main.js`, so `@bluff/contracts`' TypeScript and JSON are compiled in. No change to `@bluff/contracts`; only `esbuild`, pinned, is added.
- **Package scripts:** `lint`, `typecheck` and `test` in `apps/bot` join `pnpm -r`, so `pnpm preflight` and CI cover it, along with knip.
- **Environment, in Railway only:**
  - `BOT_MNEMONIC`: secret, made and stored by the maintainer, never in chat or the repository;
  - `SEPOLIA_RPC_URL`: secret, a server-side key not limited to a domain;
  - `BOT_MAX_PLAYERS`;
  - `ALLOWED_ORIGINS`;
  - `PORT`.
- **Logs** are structured JSON lines: table, wallet, action and transaction hash. Dice values, the secret phrase and RPC keys never appear in logs.

### Threat model

| Threat                            | Mitigation                                                                                                                                                                                                       |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| The computer reads a human's dice | Impossible: the onchain access list grants each die only to its seat. Tested live: the relayer refuses the computer's request for a human's die. `confidentiality.test.ts` proves it for any other address.      |
| A human reads the computer's dice | Its dice are granted only to its address. It never sends them anywhere, and never logs or serves them; a test checks that no log line or response contains a face.                                               |
| Abuse of `/seat`                  | Onchain checks, one computer per table, a 5-minute parking limit, per-IP limits and CORS. Parking all 20 needs 20 fresh tables and 20 human transactions from many addresses, and they're freed after 5 minutes. |
| Draining its gas                  | Only real free tables, each needing a seated human's transaction. Gas per game is small; players are topped up in small amounts, and seating stops while the bank is below 0.05 ETH.                             |
| Its secret phrase leaks           | The wallets hold only test ETH. Rotate the phrase and fund new wallets, then update `config/computer-players.ts`.                                                                                                |
| RPC key leaks                     | Server-side only; not `NEXT_PUBLIC_`.                                                                                                                                                                            |
| Service restarts mid-game         | It resumes from `tableOf`; turns already taken are onchain.                                                                                                                                                      |
| Relayer outage                    | It retries, then lets the turn time out honestly, as a player whose app failed would.                                                                                                                            |
| A human leaves                    | The usual onchain rules end the game; the computer's seat is freed.                                                                                                                                              |

## Diagram

```
 lobby: Play the computer
   │ createFreeTable(2, public)            (the player's own transaction)
   ▼
 waiting room ──POST /seat {tableId}──► apps/bot (Railway; wakes if asleep)
                                          │ getTable: waiting, free, public,
                                          │ 2 seats with 1 player, <10 min old; free funded wallet
                                          ▼
                                 wallet k ─► joinFreeTable ─► setReady(true)
   player presses Start ─► GameStarted
                                          │
 Bluff events / polling (2 s) ◄───────────┤ while seated
                                          ▼
                          its turn ─► diceOf(own) ─► decryptValues (own permit, relayer)
                                          │                          values 0..5 → faces 1..6
                                          ▼
                    strategy(bidChance from @bluff/game) ─► placeBid / callBluff
                                          │
                  keeperDuty (shared) ─► settleReveal (decryptPublicValues proof) / claimTimeout
                                          │
                                   GameEnded ─► wallet k free; polling stops when all free
```

## Consequences

- **Better:**
  - anyone can play at once, alone, with real hidden dice and a verified reveal;
  - the computer is visibly bound by the same encryption as everyone;
  - the rules live once, in `@bluff/game`, for both the web app and the computer.
- **Costs:**
  - a third deployable to run and watch: Railway's trial, then $5 a month;
  - one bank wallet to top up with test ETH, which funds up to 20 players automatically;
  - a cold start of a few seconds after idle time.
- **Removed from `apps/web`:** `bid-rules.ts`, `bid-odds.ts`, `table-view.ts` and `keeper-duty.ts` (moved, not copied), plus the `Face` type in `dice-physics.ts` (now in `@bluff/game`).
- **Packages:**
  - `apps/bot` adds `esbuild` (bundling), pinned.
  - It reuses packages already in the repository at the same pinned versions: `viem`, `@zama-fhe/sdk` and `vitest`.
  - No web framework: Node's `http` serves the two endpoints.
- **Contracts:** unchanged. No upgrade.
- **Out of scope, for later:** the onchain FHE player (option B), paid tables, difficulty levels, a computer that remembers how each player tends to bid and bluff, more than one computer per table, adding a computer to a table made for people, and chat.

## Verification

1. **First, a 30-minute spike on Sepolia** with a throwaway funded wallet, from Node 24:
   - join a free table and decrypt its own dice with `node()`;
   - get a public reveal proof that `settleReveal` accepts;
   - **confirm the relayer refuses** its request to decrypt another player's die.

   If any step fails, work stops and this ADR is revisited.

2. **`@bluff/game`:** the moved tests pass unchanged, and the web app's whole suite passes against the package.
3. **Strategy tests:**
   - odds against hand-computed cases;
   - never an illegal bid;
   - always calls an impossible bid, never calls a bid its dice make true;
   - calls the maximal bid;
   - the opening rule;
   - the bluff rate over 10,000 seeded turns is within 15 ± 2 %.
4. **Seat policy and pool tests:**
   - every refusal, and the success path;
   - a free player is reused first;
   - a new account is brought in, funded and named when all are busy;
   - a taken name falls to the next spare;
   - the cap of 20;
   - `resting` while the bank is low.
5. **Server tests:** status codes, CORS, the rate limit and `/health` content, including no dice.
6. **Seat lifecycle tests,** with a fake chain:
   - join, ready, play, end;
   - ready again after a reopen;
   - leaves an unstarted table after 5 minutes;
   - freed when the host leaves;
   - resumes after a restart;
   - acts at most once per turn;
   - lets a turn lapse when decryption fails;
   - never logs a die.
7. **Web tests:** Play the computer through success, waking, a person taking the seat first, refusal and failure; the Computer badge; and Quick play (the renamed Play now) everywhere it appears.
8. **`pnpm preflight` and CI** are green.
9. **Live on Sepolia:**
   - a full game against the computer, signed in with Google and with MetaMask;
   - three games at once, so a fourth player is seated by bringing in a new player;
   - a forced restart mid-game;
   - a cold start after sleep;
   - the median time per move recorded.
