# ADR-2026-11-11: The web app

- **Status:** Approved
- **Approved by:** (MarkDavid, 11th Nov 2026; filled in by the maintainer)
- **Companion:** [ADR-2026-11-11-web-app-for-dummies.md](ADR-2026-11-11-web-app-for-dummies.md)
- **Builds on:** [Client state and action feedback](ADR-2026-11-10-client-state-and-action-feedback.md), [Onboarding with Privy](ADR-2026-11-10-onboarding-with-privy.md), [Game flow and timing](ADR-2026-11-10-game-flow-and-timing.md), [Chips and buy-ins](ADR-2026-11-11-chips-and-buy-ins.md)
- **Plan:** [2026-11-11-web-app-plan.md](../plans/2026-11-11-web-app-plan.md)

## Context

The contracts are live on Sepolia and a free and a paid game have been played against them from a script ([contracts.md](../contracts.md#on-sepolia)). The web app is still a landing page. The approved ADRs already settle state (TanStack Query through wagmi and the Zama React SDK), feedback (one action status model, one `notify` module), sign-in (Privy with EIP-7702 sponsorship) and the game journey. Six questions are still open, and the live run answered some of them with numbers.

1. **Reading the chain.** The public RPC answered reads and gas estimates from an older block twice in three runs, and rate-limits shared traffic. A player's screen built on it would flicker back to an old turn, or refuse a valid move.
2. **Moves nobody presses.** Six contract actions keep a table moving: `confirmSeats`, `settleReveal`, `claimTimeout`, `cancelVerification`, `cancelStuckReveal` and `cancelTable`. The game flow ADR says the apps send them automatically. If every app sends them at once, all but one revert, and each revert costs sponsored gas and shows an error.
3. **Contract types in the app.** ABIs and addresses must come from `@bluff/contracts` with full types, and that package exports nothing yet.
4. **Names.** The game flow ADR gives each new player a generated nickname. Nicknames are not unique onchain, so two "Brave Otter"s can share a table.
5. **Measured timings.** Moves take 4 to 16 seconds, pay-and-join 11 to 23, the first encryption 14 to 17 (spike). The screens must make these waits feel intentional.
6. **Hosting.** Vercel is paused until about 2026-11-28; work must not wait for it.

## Options considered

### Reading the chain

- **The public RPC.** Free and already configured. Lagging, load-balanced answers, and shared rate limits.
- **A Next.js route handler proxying a keyed provider.** Hides the key, but adds a server hop to every read and a function invocation per request.
- **A keyed provider in the browser, locked to Bluff's domains, with a second provider as fallback, and every read pinned to a block the app has seen.** No server hop. The key is visible, but an origin allowlist makes it useless elsewhere, and the free tiers cover this traffic. viem's `fallback` transport switches providers on failure; reading at a known block removes the flicker.

### Moves nobody presses

- **Every app sends them as soon as they are due.** Simple; up to three reverts per due action at a 4-player table.
- **A server bot sends them.** One sender, no races, but a server, a funded key and a single point of failure, which the "anyone can call" design exists to avoid.
- **Every app sends them on a stagger.** One player is first in line, chosen by the table state, and everyone else waits a few seconds longer before stepping in, and only if the action is still due. Normally one transaction lands; a player who closed their browser is covered by the next.

### Contract types

- **`@wagmi/cli` with its Hardhat plugin.** Generates typed ABIs and hooks; a new dependency and generated hooks we would not use, because components never call wagmi directly.
- **A short script in the contracts package** writes each ABI `as const` from the Hardhat artifacts into an exported module, next to the deployment record. No new dependency.

### Names

- **Nicknames only.** Ambiguous when two match.
- **Nickname plus a tag from the address,** shown as "Brave Otter #4E31", the last four characters of the address. Not stored; computed in the app, so it cannot drift from the address it describes.

## Decision

- **Routes.** `/` and `/how-to-play` are server-rendered and load no game code. The `(game)` route group holds `/play` (the lobby), `/welcome` (first-time nickname and chips), `/table/[id]` (waiting room, game, results and watching) and `/fairness`. Only `(game)` loads the providers: Privy, wagmi, TanStack Query and Zama.
- **Reading the chain.** Reads go to a keyed Sepolia provider set in `NEXT_PUBLIC_SEPOLIA_RPC_URL`, restricted to Bluff's domains, through viem's `fallback` transport, with the public RPC as the second provider. Every read of table state is pinned to the newest block the app has seen: from a receipt, an event or the block watcher. A newer answer never gets replaced by an older one, and a move is only sent once the provider has reached that block. Writes go through Privy's sponsored wallet, which uses its own infrastructure.
- **Moves nobody presses.** A `useTableKeeper` hook in the `table` feature watches the table and sends due actions on a stagger. Who goes first depends on the action: for `settleReveal` it's the caller, for `claimTimeout` the next player in turn order, for the payment check and cancellations the host. Every other seated player follows 8 seconds later per position in seat order, and only if the action is still due on a fresh read. Keeper moves show no toast unless they fail twice. Watchers never send them.
- **Contract types.** `pnpm compile` also writes `packages/contracts/exports/abis.ts`, which holds the ABIs `as const` and is git-ignored like `types/`. The package exports it, with `deployments/sepolia.json`, as `@bluff/contracts`. CI's build job runs `pnpm compile` before `pnpm build`.
- **Names.** Players are shown as nickname plus tag: "Brave Otter #4E31". A player who has no nickname is "Player #4E31". On `/welcome`, the nickname field is pre-filled with a suggestion from a fixed list of 40 adjectives and 40 animals, with a **Suggest another** button. The player can type their own, and it's checked against the contract's rules (3 to 20 characters: letters, digits, single spaces, `_` and `-`) before sending.
- **Hidden values.** A player signs one decryption permit per session, covering `Bluff` and the chip token, on their first visit to `/play`. Embedded wallets sign without a screen. Dice and balances are decrypted with the Zama React SDK, retrying for up to 30 seconds, and are kept only in memory.
- **Waiting with intent.** The dice roll animation runs while the player's own dice are being revealed. The reveal shows every die turning face up while `settleReveal` lands. Sending a move flips the turn locally at once, marked as pending, and rolls back if it fails. The Zama SDK starts loading on `/play`.
- **Practice chips.** "Claim chips" appears whenever the faucet's `nextClaimAt` has passed, matching the contract (100 chips every 24 hours). `how-to-play.md`'s "fewer than 10" rule is corrected to match the contract.
- **Winnings and cashing out.** Winnings need no action: `payOut` moves the pot into each winner's chip balance in the transaction that ends the game, and the balance refreshes on the `PotPaid` event. **Cash out** turns chips back into the mock USDT they wrap. It uses the chip token's own two-step unwrap through the Zama React SDK (`useUnshield`): burn the chips, then finish with the public reveal of the burnt amount. The cashed-out dollars then show in any wallet and on Etherscan. A cash-out interrupted between the two steps resumes on the player's next visit (`usePendingUnshield`, `useResumeUnshield`). No contract changes. On mainnet the same flow would pay out real USDT.
- **Hosting.** Each slice is verified on `pnpm dev` and the production build locally, signed in with Google and with an own wallet, until Vercel returns. Then it deploys to staging. Privy's allowed origins and the RPC key's allowlist list localhost and the Vercel domains.
- **Build order.** The work ships in ten pull requests: a design pass, then nine builds including the computer player and avatar uploads, each usable on its own ([plan, section 9](../plans/2026-11-11-web-app-plan.md#9-build-order)).

## Diagram

```
                ┌──────────────── (game) route group, client providers ────────────────┐
                │  PrivyProvider ─► WagmiProvider ─► QueryClientProvider ─► ZamaProvider │
                └───────────────────────────────┬──────────────────────────────────────┘
                                                │
 features: account · chips · lobby · table · fairness      (index.ts only, no cross-imports)
     │ reads (feature hooks, queryOptions)             │ writes (useAction)          │ hidden values
     ▼                                                 ▼                             ▼
 viem fallback transport, reads pinned to block N   Privy embedded wallet       Zama React SDK
   ├─ keyed Sepolia provider (domain-locked)          EIP-7702, sponsored         encrypt, decrypt,
   └─ public RPC                                       │                          public reveal
     │                                                 ▼                             │ 30 s retry
     └──────────────────────────────────────►  Bluff · BluffCashier · ChipFaucet ◄──┘
                     events ─► setQueryData            ▲
                                                       │ due actions, staggered by seat
                                          useTableKeeper (every seated player's app)
```

## Consequences

- Screens never step backwards, and a valid move is not refused because a node is behind.
- One transaction per due action in the normal case. A table keeps moving as long as one seated player has the app open.
- Two keys to manage: Privy's app id (already set) and the RPC key. Both are public by design, so each is locked to Bluff's domains in its provider's dashboard.
- A new account on a keyed RPC provider (Alchemy or Infura, free tier), set up by the maintainer.
- Packages added, each in the first pull request that uses it, pinned exactly:
  - `@privy-io/react-auth` and `@privy-io/wagmi`, plus `@solana/kit` 8.x only if Privy's optional Solana modules still break the build (spike).
  - `wagmi`, `viem` and `@tanstack/react-query`.
  - `@zama-fhe/sdk` and `@zama-fhe/react-sdk`.
  - `sonner`.
  - `@tanstack/eslint-plugin-query`, as a dev dependency.
  - shadcn primitives, added as used.
- `@bluff/web` gains a workspace dependency on `@bluff/contracts`. CI's build job compiles the contracts first.
- Removed: the "fewer than 10 chips" rule in `how-to-play.md`.

## Verification

- Hook tests (`renderHook` with a test `QueryClient`) cover loading, success, error and an event-driven update for every read hook.
- `useAction` has tests for every status transition and for the 100, 300, 500 ms and 15 s timing rules.
- `useTableKeeper` has tests, on fake timers, for who goes first, the 8-second stagger, the fresh-read check and watchers never sending.
- Block pinning has a test: an older answer never replaces a newer one.
- Each slice is used in the running app, signed in with Google and with an own wallet.
- Before submission, timed playtests on Sepolia with 2, 3 and 4 players record game length against the 8 to 12 minute target, and count the reverted keeper transactions (target: none in a normal game).
