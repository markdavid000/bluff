# AGENTS.md

Rules for every AI coding agent working in this repository: Claude Code, Codex, Gemini, Cursor, Copilot, Qwen and any custom harness. They are mandatory. Where this file and a tool's defaults disagree, this file wins.

The coding bar is [`docs/engineering-standards.md`](docs/engineering-standards.md). The code's shape is [`docs/architecture.md`](docs/architecture.md). The human workflow is [`CONTRIBUTING.md`](CONTRIBUTING.md). Read all three before your first change in a session.

---

## Directive 0: Read before you act

No agent edits, creates or deletes anything before it has read the codebase it is about to change.

1. Read this file, the engineering standards and the architecture document.
2. Read every file you will change, the files that import it, and its tests. For a contract change, read the web hooks that call it; for a hook, read the contract function it calls.
3. Read the recent history of that area: `git log --oneline -20 -- <path>`.
4. Search for existing code that already does the job (`rg`, feature `index.ts` files, `src/components/shared/`, `src/hooks/`, `src/lib/`, `src/components/ui/`, `contracts/libraries/`). Extending what exists beats writing something new.
5. Read the current documentation for every framework and library involved: `node_modules/next/dist/docs/` for Next.js, [docs.zama.org](https://docs.zama.org/protocol) for the Zama Protocol, Solidity library and SDK, the official docs for everything else.
6. State your understanding of the current behaviour and the planned change before the first edit. If you cannot explain how the code works today, you have not read enough.

## Directive 1: Protected branches and worktree isolation

- Never commit or push to `dev`, `staging` or `main`. While the repository is private, the local `branch guard` hook enforces it; GitHub branch protection takes over once it is public.
- Do all work in an isolated worktree cut from the branch the work is destined for, normally `origin/dev`:
  `git worktree add .worktrees/<branch> -b <branch> origin/dev`
- Sync before you branch: `git fetch origin dev staging main`. Never trust a local long-lived branch.
- Code flows one way: **feature branch → `dev` → `staging` → `main`**.
  - `dev` is for development. Every feature branch merges here first, and only here.
  - `staging` receives `dev` once its features are ready for testing, and deploys to the Vercel staging URL.
  - `main` receives `staging` once the features are tested, and deploys to production.
- A pull request into `staging` must come from `dev`; a pull request into `main` must come from `staging`. The `branch flow` CI check rejects anything else.
- Only the repository owner merges into `staging` and `main`. Agents never open, approve or merge promotion pull requests unless that person asks.
- Do not commit or push on a person's behalf unless they ask.
- **AI tools never co-author a commit in this repository.** No `Co-Authored-By` line naming an AI, no session trailer, no "Generated with" footer, in commits or pull request descriptions. `.claude/settings.json` turns Claude Code's attribution off, and the `commit-msg` hook (commitlint rule `no-ai-attribution`) rejects any commit that carries one. The human who commits is the author.

## Directive 2: Human approval before non-trivial work

Non-trivial means: a new feature, a new dependency, a new layer or folder convention, a change to build, deploy or CI, a change to a game rule, a contract storage or interface change, or anything touching chips.

Before writing code for it, write two Architectural Decision Records from the templates in `docs/adr/`:

1. `docs/adr/ADR-<YYYY-MM-DD>-<topic>.md`: the technical record (context, options, decision, consequences, diagram).
2. `docs/adr/ADR-<YYYY-MM-DD>-<topic>-for-dummies.md`: the same decision in plain English for non-technical readers.

Then stop. An agent never approves its own ADR or plan. Work starts only after a human explicitly approves both documents.

## Directive 3: Red, then green

Every bug fix starts with a failing test that reproduces the bug, in Vitest for the web app or Hardhat for a contract. Run it and confirm it fails for the reason you identified. Then write the smallest fix that makes it pass, and run the whole suite.

## Directive 4: No symptom masking

Never make an error, a type error or a failing test go away without fixing its cause:

- no empty or silent `catch` blocks,
- no `@ts-ignore`, `@ts-expect-error`, `any` or non-null assertions to quiet the compiler,
- no dummy, empty or fallback data standing in for a failed read,
- no deleting, skipping or weakening a failing test or assertion,
- no `eslint-disable` or `solhint-disable`.

## Directive 5: No comments

Nobody writes comments in this repository: no inline comments, no JSDoc, no NatSpec, no commented-out code, no section banners. If a decision needs a recorded reason, put it in the pull request description, an ADR or `docs/`. `pnpm comments:check` runs on every commit and in CI.

## Directive 6: Replace means remove

When your change supersedes an existing implementation, the same change deletes the old one with everything it carried: files, exports, styles, tests, assets, routes, contract functions, environment variables, config and every package only it used. No parallel paths, no `legacy/` folders, no dead flags. `pnpm knip` must report nothing.

## Directive 7: Packages only when used

Add a dependency in the same change that first uses it, never ahead of time. Check that the platform or an existing dependency cannot do the job first. Pin the exact version and give the reason in the PR. Remove a dependency the moment its last user goes.

## Directive 8: React the way the standards say

Use the hook that fits the job (see the [hook table](docs/engineering-standards.md#hooks)). Stateful logic, effects, subscriptions and contract calls live in custom hooks, never inline in components (see [Custom hooks](docs/engineering-standards.md#custom-hooks)). Every player action goes through the shared action status model (see [Action status and feedback](docs/engineering-standards.md#action-status-and-feedback)). The React Compiler is on: do not add `useMemo` or `useCallback` by reflex.

## Directive 9: Plain language for players

Every player-facing string lives in a feature's `copy.ts` and follows [Plain language](docs/engineering-standards.md#plain-language). No technical words, raw addresses or jargon on screen outside the `fairness` feature. `pnpm copy:check` runs on every commit and in CI.

## Directive 10: Confidentiality is the product

A hidden value that leaks breaks the game. For every contract change, check against [FHE rules](docs/engineering-standards.md#fhe-rules): access granted after every store and only to the right players, no branching on encrypted values, onchain randomness, verified public reveals. Write a test proving the wrong player cannot read what is not theirs.

## Directive 11: Preflight before done

Before you open a pull request or call a task complete, run `pnpm preflight` and get a clean pass: format, comments, copy, compile, lint, typecheck, tests, knip, production build and smoke test. Zero errors, zero warnings. Then run the app and use the change yourself. Report anything you could not verify.

## Directive 12: Use the tools you have

Check which MCP servers and skills your environment provides and use them: library docs, the Next.js bundled docs, the shadcn registry, a browser for checking the running app. Do not guess at an API a tool can show you.

---

## Lifecycle

Every task moves through these phases in order.

```
0 READ ─► 1 SYNC ─► 2 DECIDE ─► 3 PLAN ─► 4 ISOLATE ─► 5 BUILD ─► 6 VERIFY ─► 7 DOCUMENT ─► 8 DELIVER
```

| Phase       | What happens                                                                                                                                           |
| ----------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 0. Read     | Directive 0. Understand the code and the docs before anything else.                                                                                    |
| 1. Sync     | `git fetch origin dev staging main`.                                                                                                                   |
| 2. Decide   | Non-trivial work: ADR pair in `docs/adr/`, then wait for human approval (Directive 2).                                                                 |
| 3. Plan     | `docs/plans/<YYYY-MM-DD>-<topic>-plan.md`: files to touch, interfaces, state, wording, test strategy, UI sketch, what gets removed.                    |
| 4. Isolate  | Worktree off the target branch (Directive 1).                                                                                                          |
| 5. Build    | Test-first, within the layer rules, using the hooks rules, adding packages only as used, removing what you replace.                                    |
| 6. Verify   | `pnpm preflight`, then use the change in the running app, signed in with Google and with an own wallet.                                                |
| 7. Document | Release note in `docs/release-notes/<YYYY-MM-DD>-<topic>.md` from the template, with its `scenario-impact` line. Update any doc the change made wrong. |
| 8. Deliver  | Pull request against the branch you cut from, using the template. CI must pass.                                                                        |

## Pre-review audit

Before asking for review, check the change against each item. The PR template repeats them.

1. **Read first.** You read the code and docs you changed (Directive 0).
2. **Layers.** Imports point down; features are imported only through `index.ts`; no feature imports another; reusable UI lives in `components/shared/`.
3. **Hooks.** Right hook for each job; stateful logic and contract calls in custom hooks; no effects for derived state or events.
4. **Action status.** Every action uses the shared status model; feedback within 100 ms; toasts follow the timing rules.
5. **Plain language.** Player-facing text in `copy.ts`; `pnpm copy:check` passes.
6. **Confidentiality.** FHE rules followed; a test proves the wrong player cannot read hidden values.
7. **Contracts.** Custom errors, an event per state change, a test for every revert path.
8. **Tests.** Behaviour tests for the change, covering loading, empty and error states. Bug fixes were red before green.
9. **Chips.** Amounts in base units with `bigint`, never `number`.
10. **Accessibility.** Keyboard, labels, contrast, live announcements and reduced motion checked.
11. **Comments.** None.
12. **Cleanup.** Replaced code, assets, config and packages removed; `pnpm knip` clean.
13. **Preflight.** `pnpm preflight` passed with zero warnings.

## Commands

| Command                                                            | Purpose                                                   |
| ------------------------------------------------------------------ | --------------------------------------------------------- |
| `pnpm dev`                                                         | Web app dev server                                        |
| `pnpm compile`                                                     | Compile the contracts and generate their types            |
| `pnpm preflight`                                                   | Every gate, including the production build and smoke test |
| `pnpm preflight --fast`                                            | Everything except the build (runs on pre-push)            |
| `pnpm lint` / `pnpm typecheck` / `pnpm test` / `pnpm knip`         | Individual gates across both packages                     |
| `pnpm comments:check`                                              | The no-comments rule                                      |
| `pnpm copy:check`                                                  | The plain-language rule                                   |
| `pnpm --filter @bluff/contracts deploy:sepolia`                    | Deploy the contract proxies to Sepolia (once)             |
| `pnpm --filter @bluff/contracts upgrade:sepolia --contract <name>` | Upgrade a proxy in place after a validated layout check   |
