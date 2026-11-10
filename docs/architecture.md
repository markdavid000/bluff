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

| Package              | Name               | Holds                                                                       |
| -------------------- | ------------------ | --------------------------------------------------------------------------- |
| `apps/web`           | `@bluff/web`       | The game players see. Reads and writes the contracts through feature hooks. |
| `packages/contracts` | `@bluff/contracts` | The game contracts, their tests, deploy scripts and Hardhat tasks.          |

The web app depends on the contracts package for contract ABIs and deployed addresses. The contracts package depends on nothing in the web app.

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

| Feature    | Player area                                                       |
| ---------- | ----------------------------------------------------------------- |
| `landing`  | The front page that explains the game                             |
| `account`  | Signing in with Google or email, or with an own wallet            |
| `lobby`    | Creating, finding and joining tables                              |
| `table`    | Playing: own dice, bids, calling a bluff, the reveal, the results |
| `chips`    | Chip balance, getting practice chips, cashing out                 |
| `fairness` | The "How is this fair?" panel                                     |

A feature folder is created by the change that first needs it.

## Where does this go?

| You are adding                                | Put it in                                                |
| --------------------------------------------- | -------------------------------------------------------- |
| A page                                        | `src/app/`, as thin as possible, delegating to a feature |
| UI used by one feature                        | that feature's `components/`, even if it looks generic   |
| UI two or more features need                  | `src/components/shared/`                                 |
| A primitive that knows nothing about the game | `src/components/ui/`, via `pnpm dlx shadcn add`          |
| Stateful logic used by one feature            | that feature's `hooks/`                                  |
| A hook two or more features need              | `src/hooks/`                                             |
| A pure function two or more features need     | `src/lib/`                                               |
| A contract read or write                      | a feature hook, built on that feature's `queries.ts`     |
| Text a player reads                           | the feature's `copy.ts`                                  |
| A contract address or chain setting           | `src/config/`                                            |
| Game logic that must be enforced              | `packages/contracts/contracts/`, never only in the app   |

When two features keep needing each other, they are one feature. Merge them; do not open a path between them. When one feature must show another's UI, the route composes them and passes a slot (`children`, a render prop, or a callback).

## Server and client

- Components are Server Components by default. Add `"use client"` only to the smallest component that needs state, effects, event handlers or browser APIs.
- The wallet, wagmi, TanStack Query and Zama SDK providers live in a `"use client"` providers file in the layout of the route group that plays the game, not the root layout. Pages that do not play (landing) do not load them.
- The Zama SDK runs only in the browser (it uses WASM and IndexedDB). Nothing that imports it is evaluated on the server.
- Secrets never reach the client. A value that would need a `NEXT_PUBLIC_` prefix to work is not a secret by definition; anything else goes behind a route handler.

## Inside the contracts package

```
packages/contracts/
├── contracts/
│   ├── Bluff.sol             the game: tables, turns, bids, challenges, payouts
│   ├── interfaces/           external interfaces (IBluff, token interfaces)
│   └── libraries/            pure rule logic: bid ordering, dice mapping
├── deploy/                   hardhat-deploy scripts, one per contract
├── tasks/                    Hardhat tasks for operating a deployment
└── test/
    ├── unit/                 one file per contract area, against the FHEVM mock
    └── sepolia/              end-to-end checks against the live network
```

- One contract per file, named after the contract.
- Rule logic that does not touch storage goes in a library so it can be tested on its own.
- The contract is the source of truth for every rule. The web app may check a bid early to give instant feedback, but the contract decides.

## Rendering and caching

Same model as New Markets. Cache Components are off because they deadlock on Cloudflare Workers with Next.js 16.3 and later. Do not turn on `cacheComponents` or `partialPrefetching`, and do not use `"use cache"` or `cacheLife`, until OpenNext supports them; turning them back on is an ADR, and `pnpm --filter @bluff/web smoke:worker` must pass.

Game data does not use server caching at all: it is read in the browser and cached by TanStack Query.

## Deployment

- **Web app:** Cloudflare Workers through [OpenNext](https://opennext.js.org/cloudflare). `apps/web/wrangler.jsonc` defines `bluff` (production, from `main`) and `bluff-staging` (`--env staging`, from `staging`).
- **Contracts:** deployed to Sepolia with `pnpm --filter @bluff/contracts deploy:sepolia`. The deployed addresses are committed under `packages/contracts/deployments/sepolia/` and read by the web app.
