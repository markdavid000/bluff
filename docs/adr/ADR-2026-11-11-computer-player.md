# ADR-2026-11-11: The computer player

- **Status:** Approved
- **Approved by:** (MarkDavid, 11th Nov 2026; filled in by the maintainer)
- **Companion:** [ADR-2026-11-11-computer-player-for-dummies.md](ADR-2026-11-11-computer-player-for-dummies.md)
- **Builds on:** [The web app](ADR-2026-11-11-web-app.md), [Game flow and timing](ADR-2026-11-10-game-flow-and-timing.md)
- **Plan:** [2026-11-11-web-app-plan.md, section 10](../plans/2026-11-11-web-app-plan.md#10-the-computer-player)

## Context

Bluff needs at least two players. A player alone, or a judge trying the game, may find nobody to play with, and then never sees a game at all. The owner wants a computer opponent that plays well.

Bluff's dice are encrypted. A computer player that plays fairly must be a real seat at a real table, with dice it can only read the way any player does: by decrypting its own dice with a permit, through Zama's relayer. That makes it a good demonstration as well: the computer can't see anyone's dice either.

## Options considered

- **A practice game in the browser.** Instant and free, but the dice aren't hidden from anyone, and nothing touches the chain or Zama.
- **A computer player in the app of the human it plays.** No server, but the human's browser would hold the computer's dice, which defeats the point.
- **A computer player as its own service,** with its own wallet, joining free tables like any player and decrypting only its own dice. It needs a host that runs Node and a wallet funded with test ETH.

### Hosting

- **Vercel functions.** They can't keep a game running for 10 minutes or watch events between requests.
- **Railway, with app sleeping.** It runs a normal Node service and sleeps it when no request has come in for a while. A request wakes it again in a few seconds. The trial gives $5 of credit for 30 days; after that the Free plan gives $1 a month, and Hobby is $5 a month including $5 of usage.

## Decision

- **A new package, `apps/bot`** (`@bluff/bot`): a Node 24 TypeScript service using viem, `@zama-fhe/sdk` in Node mode, and `@bluff/contracts` for the ABIs and addresses. It sits at the same level as `apps/web` and follows the same standards: no comments, tests, knip, and every gate in `pnpm preflight`.
- **A shared package, `packages/game`** (`@bluff/game`): the bid rules and the table mapper, pure TypeScript with tests. It moves out of the web app in the bot's pull request, so the web app and the bot share one copy of the rules.
- **Hosted on Railway** with app sleeping. The trial starts when the bot is first deployed, around 2026-11-28, so the credit covers the demo and judging. The owner moves to Hobby if it is needed past 30 days.
- **Its own wallet.** It comes from a mnemonic in Railway's environment variables, separate from the deployer, and holds only test ETH. It pays its own gas. Its address is published in `docs/contracts.md`.
- **Free tables only.** The computer plays free tables, so it never takes or adds practice chips.
- **One HTTP endpoint, `POST /seat`,** with a table id. The bot reads the table and joins only if:
  - it's a free, waiting, 2-seat table;
  - it was created in the last 10 minutes;
  - the caller's address is seated there;
  - the bot holds fewer than 5 seats in total.

  Calls are rate-limited per address, and the request carries no secret: the checks above are all onchain facts.

- **Playing.** Once seated, the bot watches the table's events and acts on its turn after 2 to 6 seconds of "thinking", so it feels human and never rushes the player. It also runs the same keeper duties as any seated app, so the table never stalls while it is open.
- **Strategy.** The bot decrypts its own dice. Each unknown die counts toward a bid face with probability 1/3, since a die shows that face or a one. So the bot can compute the chance that a bid is true from its own matching dice plus a binomial over the unknown dice.
  - **Call:** if the current bid's chance of being true is under 35 percent.
  - **Raise:** otherwise, to the legal bid most likely to be true, with ties going to the lower bid.
  - **Bluff:** 15 percent of the time, it raises on a face it doesn't hold.

  The thresholds sit in one tested module, so they can be tuned after playtests.

- **Shown honestly.** Its nickname is set onchain to **"Baba Dice"**. The app shows a "Computer" badge on its seat, from a known-address list in `config/`, so nobody mistakes it for a person.
- **In the app.**
  - **Quick game** in the lobby creates a free 2-seat table and calls `/seat`; the bot joins and marks itself ready with `setReady`, and the player starts the game (amended by [ADR-2026-11-12-waiting-room-and-ready](ADR-2026-11-12-waiting-room-and-ready.md)).
  - When **Play now** finds no open public table, it waits 30 seconds for a human and then offers "Play the computer instead".
  - If the bot can't be reached, Quick game says "The computer is resting. Try Play now", and nothing else breaks.

## Diagram

```
 lobby: Quick game ─► createFreeTable(2) ─► POST /seat {tableId} ─► Railway (wakes if asleep)
                                                                       │ checks onchain:
                                                                       │ free, waiting, 2 seats,
                                                                       │ caller seated, < 5 seats
                                                                       ▼
                                                              bot wallet ─► joinFreeTable
                                                                       │
            Bluff events ─► bot watches its tables ─► its turn ─► decrypt own dice (permit, relayer)
                                                                       │
                                                         strategy: binomial odds ─► placeBid / callBluff
                                                                       │
                                                         keeper duties like any seated player
```

## Consequences

- Anyone can play straight away, alone, and see hidden dice and a verified reveal for real.
- A third deployable, with its own environment, logs and costs, watched by the owner.
- A wallet that needs topping up: each game costs the bot its moves' gas. The bot logs its balance and refuses new seats below 0.05 ETH.
- Packages, pinned and added in the PR that builds the bot: `viem` and `@zama-fhe/sdk` (already used by the web app), plus `vitest` for its tests. No web framework: Node's `http` module serves the one endpoint.
- No contract change.

## Verification

- Strategy tests: the binomial odds match hand-computed cases. The bot never makes an illegal bid. It calls an impossible bid every time and never calls a bid its own dice already prove.
- Endpoint tests: every refusal case, and the rate limit.
- A live run on Sepolia: a human and the bot play a full game, timed. The bot is checked to never read the human's dice: the relayer refuses it, as `confidentiality.test.ts` proves for any other player.
