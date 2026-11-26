# Contributing

Thank you for working on Bluff. This guide takes about ten minutes to read and covers everything from your first install to a merged pull request.

## Contents

1. [Before you start](#before-you-start)
2. [Prerequisites](#prerequisites)
3. [Getting set up](#getting-set-up)
4. [Project scripts](#project-scripts)
5. [Where code goes](#where-code-goes)
6. [Branches](#branches)
7. [Making a change](#making-a-change)
8. [Commit messages](#commit-messages)
9. [Pull requests](#pull-requests)
10. [Reviewing](#reviewing)
11. [Quality gates](#quality-gates)
12. [Testing](#testing)
13. [UI components](#ui-components)
14. [Writing for players](#writing-for-players)
15. [Dependencies](#dependencies)
16. [Environment and secrets](#environment-and-secrets)
17. [Deployment](#deployment)
18. [Working with AI agents](#working-with-ai-agents)
19. [Reporting bugs and requesting features](#reporting-bugs-and-requesting-features)
20. [Security issues](#security-issues)

## Before you start

Read these once, in full:

- [`docs/engineering-standards.md`](docs/engineering-standards.md): the coding bar. TypeScript, React and hooks, action status, plain language, Solidity and FHE, comments, testing, cleanup.
- [`docs/architecture.md`](docs/architecture.md): the packages, the layers, the import rules, and where each kind of code lives.
- [`AGENTS.md`](AGENTS.md): the governance rules. Written for AI agents, but the lifecycle and review checklist apply to everyone.

Then read the code you are about to change, its callers and its tests. Nobody changes code they have not read.

## Prerequisites

| Tool    | Version                  | Notes                                                                                                                                                     |
| ------- | ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Node.js | 24 (see `.nvmrc`)        | pnpm runs every script on Node 24 through `devEngines` in `package.json`, whatever Node your shell has; `pnpm preflight` stops early on any other version |
| pnpm    | pinned in `package.json` | Never use npm or yarn.                                                                                                                                    |
| Git     | 2.40 or newer            | Worktrees are part of the workflow                                                                                                                        |

## Getting set up

```bash
git clone <repository url>
cd bluff
pnpm install          # installs both packages and the Git hooks through Lefthook
pnpm compile          # compiles the contracts and generates their types
pnpm dev              # http://localhost:3000
```

To check the production build locally, run `pnpm build` and then `pnpm --filter @bluff/web start`.

To deploy contracts to Sepolia, set the deployer's variables once:

```bash
cd packages/contracts
npx hardhat vars set MNEMONIC
npx hardhat vars set SEPOLIA_RPC_URL
npx hardhat vars set ETHERSCAN_API_KEY
```

If the hooks are missing, run `pnpm exec lefthook install`.

## Project scripts

Run from the repository root.

| Script                | What it does                                                         |
| --------------------- | -------------------------------------------------------------------- |
| `pnpm dev`            | Web app dev server with Turbopack                                    |
| `pnpm build`          | Web app production build                                             |
| `pnpm compile`        | Compile the contracts and generate TypeScript types for them         |
| `pnpm format`         | Format everything with Prettier, Solidity included                   |
| `pnpm format:check`   | Check formatting only                                                |
| `pnpm lint`           | ESLint (with the architecture boundaries) and solhint, zero warnings |
| `pnpm typecheck`      | Type-check both packages                                             |
| `pnpm test`           | Vitest for the web app, Hardhat tests for the contracts              |
| `pnpm knip`           | Unused files, exports and dependencies in every package              |
| `pnpm comments:check` | The no-comments rule                                                 |
| `pnpm copy:check`     | The plain-language rule for player-facing text                       |
| `pnpm preflight`      | All of the above plus the production build and smoke test            |

Package scripts, run with `pnpm --filter <package> <script>`:

| Package            | Script                                                                       | What it does                                                                                                   |
| ------------------ | ---------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| `@bluff/web`       | `smoke`                                                                      | Start the production build, require a 200 on every public route and a redirect to sign in on every guarded one |
| `@bluff/web`       | `start`                                                                      | Serve the production build locally                                                                             |
| `@bluff/contracts` | `coverage`                                                                   | Contract test coverage report                                                                                  |
| `@bluff/contracts` | `coverage:check`                                                             | Fail if line coverage is under 95% or branch coverage under 90%                                                |
| `@bluff/contracts` | `test:sepolia`                                                               | Play a free and a paid game on Sepolia and print each step's time                                              |
| `@bluff/contracts` | `slither`                                                                    | Static analysis of every non-mock contract; fails on medium severity or higher                                 |
| `@bluff/contracts` | `deploy:local`                                                               | Deploy all four proxies with mock chips to a local `hardhat node`                                              |
| `@bluff/contracts` | `deploy:sepolia`                                                             | Deploy all four proxies to Sepolia against Zama's cUSDT, record and verify them                                |
| `@bluff/contracts` | `deploy-invites:sepolia`                                                     | Deploy `BluffInvites` beside an already deployed `Bluff` and record it                                         |
| `@bluff/contracts` | `link-invites:sepolia`                                                       | Point the recorded `Bluff` at the recorded `BluffInvites`                                                      |
| `@bluff/contracts` | `upgrade:sepolia --contract <Bluff\|BluffCashier\|BluffInvites\|ChipFaucet>` | Validate the storage layout and upgrade one proxy in place                                                     |
| `@bluff/contracts` | `validate-layout:sepolia`                                                    | Check the current source is a safe upgrade of every deployed proxy                                             |

## Where code goes

Short version. The full rules and the reasons are in [`docs/architecture.md`](docs/architecture.md).

```
apps/web/src/
├── app/                routes, layouts, providers. Thin: composes features.
├── components/
│   ├── layout/         the app shell
│   ├── shared/         reusable composites used by two or more features
│   └── ui/             shadcn primitives
├── features/<name>/    one folder per player area, imported only via index.ts
├── hooks/              hooks shared by two or more features
├── lib/                framework-free code shared by two or more features
└── config/             static configuration

packages/contracts/
├── contracts/          the game contracts, interfaces and libraries
├── tasks/              Hardhat tasks
└── test/               unit tests (FHEVM mock) and Sepolia tests
```

- Code used by one feature lives in that feature. Code two features need moves to `shared`, `hooks` or `lib`.
- Features never import each other. The route composes them.
- Components never call the contract or the Zama SDK. Feature hooks do.
- The contract enforces every rule. The app may check early for instant feedback, but never instead.
- `pnpm lint` fails on any import that breaks these rules.

## Branches

Code flows one way:

```
feature branch ──squash──► dev ──merge──► staging ──merge──► main
                          (develop)      (test)            (production)
```

| Branch    | Purpose                                                   | Accepts pull requests from | Merged by            | Deploys to         |
| --------- | --------------------------------------------------------- | -------------------------- | -------------------- | ------------------ |
| `dev`     | Development. Every feature branch lands here.             | feature branches           | anyone with write    | nothing            |
| `staging` | Testing. Developed features are promoted here and tested. | `dev` only                 | the repository owner | Vercel staging URL |
| `main`    | Production. Tested features are promoted here.            | `staging` only             | the repository owner | Vercel production  |

The rules, enforced by two GitHub rulesets since the repository went public on 2026-11-17:

- No direct pushes to any of the three, for anyone. Every change arrives by pull request.
- The `quality` check must pass before any merge, and the branch must be up to date with its base.
- The `branch flow` check rejects a pull request into `staging` that is not from `dev`, and one into `main` that is not from `staging`.
- Feature pull requests into `dev` are squash-merged. Promotions use a merge commit.
- Only the repository owner can merge into `staging` and `main`.
- **"dev: squash-merged features"** covers `dev`, and **"staging and main: promotions by merge commit"** covers `staging` and `main`. Each requires a pull request and the `quality` check, with the branch up to date with its base, and allows only its merge method. Nobody can bypass them, the owner included, and force pushes and deletion are blocked. No review approval is required, since GitHub does not let an author approve their own pull request.
- Two local guards still catch mistakes before they reach GitHub: the `branch guard` pre-commit hook refuses commits on `dev`, `staging` and `main`, and `.vscode/settings.json` turns on VS Code's branch protection, which shows a lock on those branches and prompts before committing to them.

Feature branches are named `<type>/<short-description>`, using the same types as commits: `feat/place-bid`, `fix/reveal-order`, `chore/upgrade-next`.

## Making a change

1. **Pick or open an issue.** One issue, one branch, one pull request.
2. **Decide.** Non-trivial work (a new feature, dependency, folder convention, build or CI change, a game rule, a contract interface, anything touching chips) needs an ADR pair in `docs/adr/`, approved by a maintainer before code is written. See [`docs/adr/README.md`](docs/adr/README.md).
3. **Plan.** For anything larger than a small fix, write `docs/plans/<YYYY-MM-DD>-<topic>-plan.md`.
4. **Branch in a worktree.**
   ```bash
   git fetch origin dev staging main
   git worktree add .worktrees/feat-place-bid -b feat/place-bid origin/dev
   cd .worktrees/feat-place-bid && pnpm install
   ```
5. **Build test-first.** For a bug, write the failing test before the fix.
6. **Remove what you replace.** Old components, styles, contract functions, assets, config and packages go in the same change.
7. **Verify.** Run `pnpm preflight`, then use the change in the browser, in light and dark mode, on a phone-sized viewport, signed in with Google and with an own wallet.
8. **Document.** Add a release note in `docs/release-notes/` from the template, and fix any doc your change made wrong.
9. **Open the pull request** against the branch you cut from.

## Commit messages

Commits follow [Conventional Commits](https://www.conventionalcommits.org/). The `commit-msg` hook checks it.

```
<type>(<optional scope>): <summary in the imperative, lower case, no full stop>

<optional body: what changed and why>
```

Types: `feat`, `fix`, `perf`, `refactor`, `test`, `docs`, `build`, `ci`, `chore`, `revert`, `style`.
Scopes: `web`, `bot`, `contracts`, `docs`, `ci`, `deps`, `repo`.

```
feat(contracts): roll hidden dice when a round starts
fix(web): keep the pending bid visible until it is confirmed
```

Keep commits atomic: one logical change each. AI tools never co-author a commit: no `Co-Authored-By` line for Claude or any other AI, no session trailers, no "Generated with" footers, in commits or PR descriptions. The `commit-msg` hook rejects them.

## Pull requests

- Fill in every section of the template. Unticked boxes need a reason.
- Keep the PR to the scope of its issue. Unrelated fixes get their own PR.
- Include screenshots or a short recording for any UI change, light and dark.
- A contract change lists its new or changed functions, events and errors, and the HCU cost of new encrypted operations.
- The `quality` check must be green. If the base branch moved, update your branch and let CI run again.

## Reviewing

- Open the preview and play a round. Reading a diff is not reviewing a game.
- These are blocking, not nits: a cross-feature import, a contract call or SDK call in a component, stateful logic inline in a component, an action that skips the shared status model, technical words on screen, any comment, a hidden value readable by the wrong player, a branch on an encrypted value, a contract function without revert tests, a replaced implementation left behind, a package added before it is used.
- Approve only what you would be happy to maintain.

## Quality gates

Three layers, from fastest to slowest:

| When         | What runs                                                                                                                                                                | Configured in              |
| ------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------- |
| commit       | Prettier on staged files, comment rules, copy rules, commit message lint                                                                                                 | `lefthook.yml`             |
| push         | `pnpm preflight --fast`: format, comments, copy, compile, lint, typecheck, tests, knip                                                                                   | `lefthook.yml`             |
| pull request | Everything above, contract coverage, Slither, storage layout against the deployed contracts, the production build, the smoke test, a branch flow check and a secret scan | `.github/workflows/ci.yml` |

Do not bypass hooks with `--no-verify`. If a hook is wrong, fix the hook in its own PR.

## Testing

- Web: Vitest and Testing Library. Tests sit beside the code they cover: `bid-panel.tsx`, `bid-panel.test.tsx`.
- Query the way a player does: `getByRole`, `getByLabelText`, `getByText`.
- Cover the states that exist: success, empty, loading, error.
- Test custom hooks with `renderHook`.
- Contracts: Hardhat tests against the FHEVM mock, every revert path covered, and a test proving the wrong player cannot read hidden values.
- Anything involving chip amounts gets exact tests with `bigint` values.
- Never weaken or delete a failing test to get a green run.

## UI components

The design system is shadcn/ui.

```bash
cd apps/web
pnpm dlx shadcn@latest add <component>
```

- Add a component in the PR that first uses it.
- Theme values live in `apps/web/src/app/globals.css`. Change colours there, never in components.
- A component two features need goes to `components/shared/`, not into either feature.
- Merge classes with `cn` from the `cn` package.

## Writing for players

Bluff is for everyone, not only people who know crypto. Every word a player reads lives in a feature's `copy.ts` and describes the game, not the technology. Read [Plain language](docs/engineering-standards.md#plain-language) before writing any. `pnpm copy:check` rejects technical words.

## Dependencies

- Add a package only in the change that uses it, with the reason in the PR.
- Exact versions only; `pnpm add --save-exact`.
- Dependabot opens update PRs weekly. Review the changelog; one upgrade per PR. Zama packages move together.
- When the last user of a package goes, remove the package in the same change. `pnpm knip` fails otherwise.

## Environment and secrets

- Never commit secrets. `.env*` files are ignored; CI scans every PR with gitleaks.
- Local variables go in `.env.local`, copied from the `.env.example` beside it, which lists every setting by name:
  - the web app: `apps/web/.env.local`;
  - the computer player: `apps/bot/.env.local`, read with `node --env-file=.env.local dist/main.js` from `apps/bot`. Its `BOT_MAX_PLAYERS` and `PORT` may stay empty for their defaults (20 and 8080). Use `PORT=8787` to match the web app's local `NEXT_PUBLIC_BOT_URL`.
- When a change adds a setting, it adds the name to that `.env.example` in the same change, and the pull request says so, so everyone knows to add it to their own `.env.local`. A test checks that the computer player's example lists exactly what its code reads.
- Deployed values are Vercel environment variables, set per environment (Production, Preview).
- The contract deployer's mnemonic and RPC keys go in Hardhat's variable store, never in a file.
- A secret never gets a `NEXT_PUBLIC_` prefix.

## Deployment

Before `staging` or `main` serves players, go through [the deploy checklist](docs/deploy-checklist.md): environment variables, allowed origins, Google sign-in, the computer service and the checks to do by hand.

- **Web app:** Vercel deploys from GitHub. A merge to `main` deploys production; `staging` deploys to the staging URL; every pull request gets its own preview link. The Vercel project uses `apps/web` as its root directory and needs no secrets to build.
- **Contracts:** `Bluff`, `BluffCashier`, `BluffInvites` and `ChipFaucet` are UUPS proxies; the deploy task links the cashier and the invites contract to `Bluff`. Every live task refuses to run without your own `MNEMONIC` (`npx hardhat vars set MNEMONIC`) and refuses the public test key. The repository owner deploys them once with `pnpm --filter @bluff/contracts deploy:sepolia`, which writes `packages/contracts/deployments/sepolia.json` and verifies the implementations on Etherscan. Later changes are upgrades, never redeploys: bump `version()`, then run `pnpm --filter @bluff/contracts upgrade:sepolia --contract <name>`, which refuses an unsafe storage layout. Commit `deployments/sepolia.json` and the `.openzeppelin/` manifest with every deploy or upgrade; the manifest is what the next upgrade is checked against.

- **Computer player:** one Fly.io machine, deployed by hand from a clean checkout of the branch being served (`dev` while testing, `main` once promoted). Run from the repository root:

  ```sh
  fly deploy . --config apps/bot/fly.toml --dockerfile apps/bot/Dockerfile --app <app> --ha=false
  fly status --app <app>
  ```

  - **Exactly one machine.** `fly status` must show exactly one. Never scale it above one, and never run a local copy with the same `BOT_MNEMONIC` while it's up: both would play the same computer wallets.
  - **Secrets** (`BOT_MNEMONIC`, `SEPOLIA_RPC_URL`) are typed by the maintainer in Fly's dashboard, never in chat or a shell history.
  - **`ALLOWED_ORIGINS`** lists every site that may call it: the local dev address, staging and production.

## Working with AI agents

AI agents are welcome contributors and follow [`AGENTS.md`](AGENTS.md). As the human driving an agent, you are responsible for its output:

- Approve or reject its ADRs yourself; it may not approve its own.
- Review agent PRs with the same bar as any other.

## Reporting bugs and requesting features

Use the issue templates on GitHub. A good bug report has the steps to reproduce, what you expected, what happened, the browser and device, and how you signed in.

## Security issues

Do not open a public issue for a vulnerability. Follow [`SECURITY.md`](SECURITY.md).
