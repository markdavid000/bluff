# Architecture

This is the shape of the codebase and the rules that keep it that way. ESLint enforces the import rules in the web app, so a violation fails `pnpm lint` and CI.

## The repository

Bluff is one pnpm workspace with two packages. They live together so a change to the game rules lands in the contract, its tests and the screens that show it in one pull request.

```
bluff/
├── apps/
│   └── web/                Next.js app players use
├── packages/
│   └── contracts/          Solidity contracts, tests and deploy scripts
├── docs/                   architecture, standards, ADRs, plans, release notes
├── scripts/                repository checks: comments, copy, preflight
└── .github/                CI, Dependabot, issue and pull request templates
```

| Package              | Name               | Holds                                                                                                                                                                                                                                       |
| -------------------- | ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web`           | `@bluff/web`       | The game players see. Reads and writes the contracts through feature hooks.                                                                                                                                                                 |
| `apps/bot`           | `@bluff/bot`       | The computer player: a Node 24 service with `POST /seat` and `GET /health` that seats computer players at free tables and plays them, decrypting only their own dice. See [the computer player ADR](adr/ADR-2026-11-18-computer-player.md). |
| `packages/contracts` | `@bluff/contracts` | The game contracts, their tests, deploy scripts and Hardhat tasks.                                                                                                                                                                          |
| `packages/game`      | `@bluff/game`      | The game's pure rules, shared by the web app and the computer player: bid rules and odds, the die `Face` type, the table mapper (`toTable`) and the keeper's duties. Test helpers are under `@bluff/game/testing`.                          |

The web app depends on the contracts package for contract ABIs and deployed addresses, and on the game package for the rules. The game package depends only on the contracts package, for ABI-derived types. The contracts package depends on nothing in the web app.

## How the pieces talk

```
 Player's browser                                   Sepolia
┌─────────────────────────────────────────┐        ┌──────────────────────────┐
│ apps/web                                │        │ packages/contracts       │
│                                         │  read  │                          │
│  feature hook ──► wagmi + TanStack Query├───────►│  Bluff (game rules)      │
│      │                                  │  write │    │                     │
│      │          Zama SDK (in browser)   ├───────►│    ├─ encrypted dice      │
│      │            encrypt inputs        │        │    ├─ chips (ERC-7984)    │
│      │            reveal own dice       │ events │    └─ events per change   │
│      ▼                                  │◄───────┤                          │
│  component renders hook result          │        └────────────┬─────────────┘
└─────────────────────────────────────────┘                     │
                    ▲                                           ▼
                    │ decrypt own dice, public reveal   ┌──────────────────────┐
                    └───────────────────────────────────┤ Zama relayer and KMS │
                                                        └──────────────────────┘
```

- **Reads** go through TanStack Query (via wagmi), so every screen shares one cache.
- **Live updates** come from contract events. A feature hook watches the events it cares about and writes the new state into the cache, so the screen updates without waiting for the next poll. A slow poll stays on as a safety net.
- **Writes** go through one shared action status model (see [Action status](engineering-standards.md#action-status-and-feedback)), so every button, toast and screen reports progress the same way.
- **Hidden values** (dice) are created and stored encrypted by the contract. Only the player they belong to can reveal them in their browser, through the Zama SDK. When someone calls a bluff, the dice are made public with a proof the contract checks.

## Layers in the web app

The web app uses the **feature-based architecture with one-way layers** from New Markets, the structure popularised by [Bulletproof React](https://github.com/alan2207/bulletproof-react). Code is grouped by what it does for the player (a feature), not by its technical kind. Every import points down the diagram, and features never import each other.

Two rules on top:

1. **Features have a public entry point.** Outside code imports a feature only through its `index.ts`. Everything else in the folder is private and free to change.
2. **The lint policy is default-deny.** An import is allowed only if a policy names it. A new folder under `src/` that fits no layer fails lint until this document says where it belongs.

```
            ┌────────────────────────────┐
            │  app/   routes, layouts,   │
            │         providers          │
            └─────────────┬──────────────┘
                          │
            ┌─────────────▼──────────────┐
            │  components/layout/        │
            │  app shell                 │
            └─────────────┬──────────────┘
                          │  (features via index.ts only)
            ┌─────────────▼──────────────┐
            │  features/<name>/          │
            │  one folder per player     │
            │  area, never cross-import  │
            └─────────────┬──────────────┘
                          │
            ┌─────────────▼──────────────┐
            │  components/shared/        │
            │  reusable composites       │
            └─────────────┬──────────────┘
                          │
       ┌──────────────────┼──────────────────┐
       ▼                  ▼                  │
┌──────────────┐   ┌──────────────┐          │
│ components/  │──▶│   hooks/     │          │
│ ui/          │   │ cross-cutting│          │
└──────┬───────┘   └──────┬───────┘          │
       └────────┬─────────┘                  │
                ▼                            ▼
         ┌──────────────┐            ┌──────────────┐
         │    lib/      │───────────▶│   config/    │
         │ pure utils   │            │ static config│
         └──────────────┘            └──────────────┘
```

| Layer                | Holds                                                                                               | May import                                                        |
| -------------------- | --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `app/`               | Routes, layouts, metadata files and the client providers. Composes features, owns no logic.         | everything below; features through `index.ts` only                |
| `components/layout/` | The app shell: header, navigation, footer.                                                          | `shared`, `ui`, `hooks`, `lib`, `config`; features via `index.ts` |
| `features/<name>/`   | Everything one player area needs: components, hooks, queries, wording, types.                       | its own files, `shared`, `ui`, `hooks`, `lib`, `config`           |
| `components/shared/` | Reusable composites two or more features need: empty and error states, chip amounts, action button. | `shared`, `ui`, `hooks`, `lib`, `config`                          |
| `components/ui/`     | Design system primitives from shadcn. Know nothing about the game.                                  | `ui`, `hooks`, `lib`                                              |
| `hooks/`             | Hooks needed by two or more features, such as the action status hook.                               | `hooks`, `lib`, `config`                                          |
| `lib/`               | Framework-free code needed by two or more features: formatting, error translation, query client.    | `lib`, `config`                                                   |
| `config/`            | Static configuration: site name, chain, contract addresses.                                         | `config`                                                          |

### `ui` and `shared`

Both are reusable, and the difference is what they know.

- `components/ui/` is the design system: `Button`, `Dialog`, `Card`, `Skeleton`. A primitive would work unchanged in any app.
- `components/shared/` is built from primitives and knows about Bluff's conventions, but not about any one feature: `EmptyState`, `ErrorState`, `ChipAmount`, `ActionButton`, `PlayerName`, `Countdown`. It may use shared hooks such as the action status hook.

When a component inside a feature is needed by a second feature, it moves to `components/shared/` in the same change. It never gets imported across features.

## Inside a feature

Create only the folders a feature needs. An empty folder is noise.

```
src/features/<name>/
├── components/      UI for this feature only
├── hooks/           stateful logic for this feature (custom hooks)
├── lib/             pure logic and mappers for this feature, with tests
├── queries.ts       TanStack Query options factories, keys start with the feature name
├── copy.ts          every player-facing string this feature shows
├── types.ts         the feature's domain types
└── index.ts         public API for the rest of the app
```

- `index.ts` exports what the rest of the app may render or call.
- Tests sit next to the file they cover: `bid.ts` and `bid.test.ts`.

The planned features:

| Feature    | Player area                                                                                        |
| ---------- | -------------------------------------------------------------------------------------------------- |
| `landing`  | The front page that explains the game                                                              |
| `account`  | Signing in with Google or email, or with an own wallet                                             |
| `lobby`    | Creating, finding and joining tables                                                               |
| `table`    | `/table/[id]`: the waiting room, joining by link, then own dice, bids, calls, results              |
| `chips`    | Chip balance, getting practice chips, cashing out                                                  |
| `fairness` | The public `/fairness` page: why the game is fair, with the technical detail and links to check it |
| `rules`    | The public `/how-to-play` page, mirroring `docs/how-to-play.md`                                    |

A feature folder is created by the change that first needs it.

## Where does this go?

| You are adding                                            | Put it in                                                |
| --------------------------------------------------------- | -------------------------------------------------------- |
| A page                                                    | `src/app/`, as thin as possible, delegating to a feature |
| UI used by one feature                                    | that feature's `components/`, even if it looks generic   |
| UI two or more features need                              | `src/components/shared/`                                 |
| A primitive that knows nothing about the game             | `src/components/ui/`, via `pnpm dlx shadcn add`          |
| Stateful logic used by one feature                        | that feature's `hooks/`                                  |
| A hook two or more features need                          | `src/hooks/`                                             |
| A pure function two or more features need                 | `src/lib/`                                               |
| A game rule the web app and the computer player both need | `packages/game/src/`                                     |
| A contract read or write                                  | a feature hook, built on that feature's `queries.ts`     |
| Text a player reads                                       | the feature's `copy.ts`                                  |
| A contract address or chain setting                       | `src/config/`                                            |
| Game logic that must be enforced                          | `packages/contracts/contracts/`, never only in the app   |

When two features keep needing each other, they are one feature. Merge them; do not open a path between them. When one feature must show another's UI, the route composes them and passes a slot (`children`, a render prop, or a callback).

## Server and client

- Components are Server Components by default. Add `"use client"` only to the smallest component that needs state, effects, event handlers or browser APIs.
- The wallet, wagmi, TanStack Query and Zama SDK providers live in one `"use client"` file, `app/providers.tsx`, used by the layouts of the `(auth)` group (sign-in, refresh) and the `(game)` group (lobby, tables, profile), not by the root layout. Pages that do not play do not load them: the landing page, and the `(learn)` group (`/how-to-play`, `/fairness`), which has its own light layout with the street backdrop, the name and the screen controls.
- **Route protection** ([ADR-2026-11-12-route-protection](adr/ADR-2026-11-12-route-protection.md)): `src/proxy.ts` runs on the server before every `(game)` page. It checks the `bluff-session` cookie, and sends anyone without one to `/sign-in` (or `/refresh` when it has expired). `POST /api/session` sets that cookie only after verifying Privy's access token against Privy's published keys. `proxy.ts` is its own lint element: it may import only `lib` and `config`. A test fails if a `(game)` page is ever left outside the proxy's matcher.
- The Zama SDK runs only in the browser (it uses WASM and IndexedDB). Nothing that imports it is evaluated on the server.
- Secrets never reach the client. A value that would need a `NEXT_PUBLIC_` prefix to work is not a secret by definition; anything else goes behind a route handler.

## Inside the contracts package

```
packages/contracts/
├── contracts/
│   ├── Bluff.sol             the game: tables, turns, bids, calls, reveals, endings; holds no chips
│   ├── BluffCashier.sol      every chip: pay-and-join, payments, refunds, payouts
│   ├── BluffInvites.sol      private tables' encrypted invite codes and who is invited
│   ├── ChipFaucet.sol        daily practice chips and nicknames
│   ├── interfaces/           external interfaces (IBluff, IBluffCashier, IBluffInvites, tokens)
│   ├── libraries/            pure rule logic: BidRules, TableRules, NicknameRules
│   └── mocks/                contracts that exist only for tests
├── config/                   chip token addresses per network
├── deployments/              proxy and implementation addresses per network
├── tasks/                    Hardhat tasks: deploy, deploy-invites, link-invites, upgrade, accounts
├── scripts/                  checks for this package: coverage gate, Slither
└── test/
    ├── fixtures.ts           deploys what each test needs
    ├── unit/                 one `<area>.test.ts` per contract area, against the FHEVM mock
    └── sepolia/              end-to-end checks against the live network
```

- Every external function, event, error and encrypted value is listed in [`contracts.md`](contracts.md).
- `Bluff` and `BluffCashier` only accept their linking calls from each other (see [ADR-2026-11-11-bluff-cashier](adr/ADR-2026-11-11-bluff-cashier.md)). A player pays and joins through the chip token, which calls the cashier; the cashier seats the player in `Bluff`; `Bluff` tells the cashier whom to refund or pay.
- `BluffInvites` only accepts new codes from `Bluff`, and `Bluff` asks it whether a player is invited before seating anyone at a private table (see [ADR-2026-11-13-private-tables-and-table-ids](adr/ADR-2026-11-13-private-tables-and-table-ids.md)).
- `Bluff` is compiled with 50 optimizer runs (a per-file override in `hardhat.config.ts`). `limits.test.ts` keeps at least 768 bytes under the 24,576-byte contract size limit for future fixes, a margin the maintainer lowered when private tables were added and again for clearing ready marks on reopen. Every other contract uses 800.
- One contract per file, named after the contract.
- Rule logic that does not touch storage goes in a library so it can be tested on its own.
- The contract is the source of truth for every rule. The web app may check a bid early to give instant feedback, but the contract decides.

## Rendering and caching

Game data does not use server caching: it is read in the browser and cached by TanStack Query. Pages with no request-time data (the landing page) are prerendered at build time. Cache Components are not used; turning them on is a decision for its own ADR.

## Deployment

- **Web app:** [Vercel](https://vercel.com), Hobby plan, with `apps/web` as the project root. `main` deploys production, `staging` deploys to the staging URL, and every pull request gets a preview link. `siteConfig.url` reads Vercel's production host at build time.
- **Contracts:** UUPS proxies on Sepolia, deployed with `pnpm --filter @bluff/contracts deploy:sepolia` and upgraded in place with `upgrade:sepolia`. Addresses live in `packages/contracts/deployments/sepolia.json`, which the web app reads; the proxy addresses never change.
- **Computer player (`apps/bot`):** a [Railway](https://railway.com) service ([ADR-2026-11-18-computer-player](adr/ADR-2026-11-18-computer-player.md)). Its settings live in Railway's dashboard, not in a file, since Railway's `railway.json` stops being read for new services on 2026-12-01.
  - **Root directory:** the repository root, so the whole pnpm workspace installs.
  - **Build command:** `pnpm --filter @bluff/bot build`.
  - **Start command:** `pnpm --filter @bluff/bot start`.
  - **Health check:** `/health`.
  - **App sleeping:** on.
  - **Variables** (also listed by name in `apps/bot/.env.example`):
    - `BOT_MNEMONIC`: secret;
    - `SEPOLIA_RPC_URL`: secret, an https RPC key not limited to a domain;
    - `ALLOWED_ORIGINS`: the web app's sites, separated by commas;
    - optionally `BOT_MAX_PLAYERS` (1 to 24, default 20).
  - Railway sets `PORT`. Node 24 comes from `engines` and `.nvmrc`, and pnpm from `packageManager`.
  - **The web app finds it** through `NEXT_PUBLIC_BOT_URL`, the service's public address (not a secret), set in Vercel and in `apps/web/.env.local`. The computers' public addresses are listed in `apps/web/src/config/computer-players.ts` for the Computer badge; a new secret phrase means a new list.
