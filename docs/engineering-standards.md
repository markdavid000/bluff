# Engineering Standards

The coding bar for this repository. It binds every contributor, human or AI. Where a rule can be checked by a machine, it is, and the check is named next to the rule. The rest is enforced in review.

Contents: [Before you start](#before-you-start) · [Principles](#principles) · [TypeScript](#typescript) · [Components](#components) · [Hooks](#hooks) · [Custom hooks](#custom-hooks) · [Contract data in the app](#contract-data-in-the-app) · [Action status and feedback](#action-status-and-feedback) · [Plain language](#plain-language) · [Solidity and FHE](#solidity-and-fhe) · [Styling and UI kit](#styling-and-ui-kit) · [Performance](#performance) · [Accessibility](#accessibility) · [Errors](#errors) · [Testing](#testing) · [Comments](#comments) · [Naming](#naming) · [Dependencies and cleanup](#dependencies-and-cleanup) · [Security](#security) · [Documentation](#documentation)

---

## Before you start

Read before you write. Nobody, human or agent, changes code they have not read.

1. Read `AGENTS.md`, this file and [`docs/architecture.md`](architecture.md).
2. Read the code you will touch, the code that calls it, and its tests. Read `git log` for that area.
3. Search for an existing implementation before writing one (`rg`, the feature's `index.ts`, `src/components/shared/`, `src/hooks/`, `src/lib/`, `src/components/ui/`, `contracts/libraries/`). Reuse it or extend it.
4. Read the current documentation for every framework or library involved: `node_modules/next/dist/docs/` for Next.js, [docs.zama.org](https://docs.zama.org/protocol) for the Zama Protocol and SDK, the official site for everything else. Never code against a remembered API.
5. If the change is non-trivial, the ADR comes before the code (see `AGENTS.md`).

## Principles

- **Separation of concerns.** A module does one job. Rendering, state, contract access and formatting live in different places: component, hook, query factory, `lib` function.
- **DRY.** One source of truth for every piece of knowledge: one `cn`, one query client, one action status model, one error translator, one formatter per kind of value, one type per domain concept. The second time you write something, extract it. Duplication of _knowledge_ is the problem; two components that happen to look alike are not.
- **KISS.** The simplest code that is correct wins. No abstraction without two real callers. No configuration for a case nobody has.
- **YAGNI.** Build what the current issue needs. No speculative props, flags, layers or packages.
- **SOLID, applied to React.**
  - Single responsibility: a component renders, a hook manages state, a query factory describes a read.
  - Open/closed: extend through props, `children` and composition, not by editing a shared component for one caller.
  - Liskov: a variant component accepts everything its base accepts.
  - Interface segregation: props are the minimum a component needs. Pass `bid`, not the whole `table`.
  - Dependency inversion: features depend on types they own (`types.ts`), not on an SDK's or ABI's shapes.
- **Composition over configuration.** Prefer `children` and slots to boolean props. Three booleans on one component is a sign it should be two components.
- **Modularity.** A file past roughly 200 lines, or a component past roughly 150, is usually doing two jobs. Split it.
- **Correct over fast.** If a choice is between a shortcut and the correct fix, take the fix and say what it costs.

## TypeScript

- `strict` stays on. No `any` (lint: `@typescript-eslint/no-explicit-any`). At a third-party boundary, type the value as `unknown` and narrow it.
- No `@ts-ignore`, no `@ts-expect-error` (lint: `ban-ts-comment`). Fix the type.
- No non-null assertions to silence the compiler. Handle the `null`.
- Types describe the domain: `type TableId = bigint & { readonly __brand: "TableId" }` beats a bare `bigint` where mixing ids is a real risk.
- Use `import type` for types (lint: `consistent-type-imports`).
- Derive types from a single source (the contract ABI, `typeof`, `ReturnType`) instead of writing them twice.
- Chip amounts are never `number`. Use base units in `bigint` and convert once, at the display edge.

## Components

- Server Components by default. `"use client"` goes on the smallest leaf that needs state, effects, event handlers or browser APIs.
- A component renders. Everything else (state machines, subscriptions, contract access, formatting) lives in a hook, a query factory or a `lib` function.
- Function declarations, named exports, one component per file. The file is named after the component in kebab case: `bid-panel.tsx` exports `BidPanel`.
- No components defined inside other components (lint: `react-hooks/static-components`).
- No text literals in JSX in features, `shared` or `layout` (lint: `react/jsx-no-literals`). Text comes from the feature's `copy.ts`.
- Props are typed with an interface or type named `<Component>Props`. Extend native element props with `ComponentProps<"button">` instead of redeclaring them.
- In React 19, `ref` is a normal prop. Do not use `forwardRef`.
- Keys are stable ids, never array indexes for lists that change.
- No dead UI: no buttons that do nothing, links to `#`, or placeholder sections. Ship the real thing or nothing.

## Hooks

The React Compiler is on (`reactCompiler: true`). It memoizes components and hooks automatically, which changes which hooks you reach for. Pick the hook that matches the job. The wrong hook is a review comment even when the code works.

| The job                                                                    | Use                                                                                                 | Not                                                              |
| -------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| One independent piece of UI state                                          | `useState`                                                                                          |                                                                  |
| Several related values, or the next state depends on an action             | `useReducer` with a typed action union                                                              | several `useState` calls updated together                        |
| A value computed from props or state                                       | compute it during render                                                                            | `useState` + `useEffect` (lint: `no-deriving-state-in-effects`)  |
| Expensive computation                                                      | compute during render; the compiler memoizes                                                        | manual `useMemo`, unless profiling shows the compiler bailed out |
| Stable callbacks for children                                              | plain functions; the compiler memoizes                                                              | manual `useCallback` by default                                  |
| Reading context                                                            | `use(Context)`                                                                                      | `useContext` in new code                                         |
| Contract state that must stay fresh (tables, bids, turns, balances)        | a feature hook over TanStack Query (wagmi read hooks or `useQuery` with `queryOptions`)             | `useEffect` + a client call, `setInterval` refetching            |
| Live updates from contract events                                          | a feature hook over `useWatchContractEvent` that writes into the query cache                        | refetching everything on every block                             |
| A player action that writes to the contract                                | a feature hook built on the shared action status hook                                               | `onClick` + manual pending and error state                       |
| Encrypting an input, revealing own dice, reading a public reveal           | a feature hook over the Zama React SDK (`useEncrypt`, `useDecryptValues`, `useDecryptPublicValues`) | calling the SDK from a component                                 |
| Show the result before the network confirms                                | `useOptimistic`, or `onMutate` with `setQueryData` and rollback                                     | copying server data into local state                             |
| Keep the UI responsive during a slow update                                | `useTransition` / `startTransition`                                                                 | debouncing state by hand                                         |
| A fast-changing input driving an expensive render                          | `useDeferredValue`                                                                                  | `setTimeout` debounce in an effect                               |
| Subscribe to something outside React (media query, online status, storage) | `useSyncExternalStore`                                                                              | `useEffect` + `useState` mirror                                  |
| Synchronise with an external system (animation instance, observer)         | `useEffect` with a cleanup                                                                          | anything that is not an external system                          |
| Non-reactive logic read inside an effect                                   | `useEffectEvent`                                                                                    | adding the value to deps, or a ref you update by hand            |
| Measure layout before paint                                                | `useLayoutEffect`                                                                                   | `useEffect` + flicker                                            |
| A mutable value that must not re-render (timer id, DOM node)               | `useRef`                                                                                            | `useState`                                                       |
| Accessible ids linking label, input and description                        | `useId`                                                                                             | hard-coded or random ids                                         |
| Hide part of the tree but keep its state                                   | `<Activity mode="hidden">`                                                                          | unmounting and re-fetching                                       |
| Animated route or state change                                             | `<ViewTransition>` where it fits                                                                    | a motion library for a simple cross-fade                         |

Effects are a last resort, not a lifecycle. Before writing `useEffect`, check: is this derived data (compute it), an event response (put it in the handler), contract data (a query hook), or an external subscription (`useSyncExternalStore`)? Only a real external system gets an effect. Setting state synchronously in an effect is a lint error (`react-hooks/set-state-in-effect`).

Rules of Hooks and exhaustive dependencies are lint errors, as are the compiler's purity, ref and immutability checks (`react-hooks/*`). Never silence them; restructure the code.

## Custom hooks

Custom hooks are how this codebase separates behaviour from rendering. They are required, not optional:

- **A component that needs more than one stateful hook, or any effect, moves that logic into a custom hook.** The component calls one hook and renders its result.
- **The same stateful logic in two places is extracted into one hook.** No copy-paste of `useState` + handler pairs.
- **Every subscription, timer, event watcher or browser API access lives in a hook**, never inline in a component.
- **Contract reads and writes go through a hook** named for what it provides (`useTable`, `usePlaceBid`), never wagmi or the Zama SDK called from a component.

How to write one:

- Name it `use` + what it provides: `useTable`, `useOwnDice`, `useCountdown`, not `useData` or `useHelper`.
- One responsibility per hook. Compose small hooks rather than growing one.
- Return a stable, typed shape. Use an object for more than two values (`{ status, data, error }`), a tuple only for `useState`-like pairs.
- Model status explicitly with a union, never a set of booleans.
- Clean up everything it starts.
- Keep it pure apart from its declared effects; it must work in Strict Mode, which runs effects twice in development.
- Add `useDebugValue` when the hook's state is not obvious in React DevTools.
- Location: `features/<name>/hooks/` if one feature uses it, `src/hooks/` once a second feature does.
- Test it with `renderHook` from Testing Library.

## Contract data in the app

- Contract state is read in the browser through TanStack Query, using wagmi read hooks or `queryOptions` factories in `features/<name>/queries.ts`. Query keys start with the feature name.
- Components reach contract data only through a named feature hook, never `useReadContract` or `useQuery` inline.
- Live updates come from contract events: the feature hook watches the events that change its data and writes the new state with `setQueryData`. A slow `refetchInterval` stays on as a fallback for missed events.
- Data already on screen stays on screen while it refreshes (`placeholderData: keepPreviousData`). Skeletons show only on first load.
- Decrypted values (a player's own dice) live only in memory, in the Zama SDK's cache. They are never written to `localStorage`, a URL or a log.
- Every user or public decryption retries every 2 seconds for up to 30 seconds. Zama's gateway reads a copy of the access list that lags Sepolia by about ten blocks, so a decryption sent straight after a transaction can fail before it syncs. The retry lives in the shared decryption hook and stays inside the action's `waiting` status; players never see the transient failure.
- Contract addresses and ABIs come from `@bluff/contracts`. No address is typed by hand anywhere else.
- Environment variables are read in one typed module in `src/config/`, never with `process.env.X` scattered across files.

## Action status and feedback

Every player action that writes to the contract or reveals a value moves through one status model, owned by a shared hook in `src/hooks/`:

```
idle ─► preparing ─► confirming ─► sending ─► waiting ─► done
                         │             │          │
                         └─────────────┴──────────┴────► failed
```

| Status       | What is happening                                            |
| ------------ | ------------------------------------------------------------ |
| `idle`       | Nothing in progress                                          |
| `preparing`  | Encrypting inputs in the browser                             |
| `confirming` | Waiting for the player to approve in their own wallet        |
| `sending`    | Submitted, not yet included                                  |
| `waiting`    | Included, waiting for the confirmation the action needs      |
| `done`       | Confirmed; the cache is updated                              |
| `failed`     | Rejected, cancelled or reverted; carries a translated reason |

The status is internal. Players see moments, not steps:

- **Instant response.** Every press changes something on screen within 100 ms: the button enters its working state, or the move appears as pending.
- **No flashes.** A working message appears only if the action is still running after 300 ms, and once shown stays at least 500 ms.
- **One message per action.** `preparing`, `sending` and `waiting` show one message ("Placing your bid…"). `confirming` shows "Confirm in your wallet" only for players using their own wallet.
- **Long waits are acknowledged.** After 15 seconds the message adds that the network is busy.
- **Optimistic where safe.** The player's own move appears at once, marked as pending, and is removed if the action fails.

### Toasts

Toasts go through one `notify` module in `src/lib/`. No feature calls the toast library directly.

| Kind      | Stays                                               | Used for                                                       |
| --------- | --------------------------------------------------- | -------------------------------------------------------------- |
| `loading` | until the action ends, then becomes the result      | an action the player started                                   |
| `success` | about 3 seconds                                     | an action finished                                             |
| `info`    | about 4 seconds                                     | something the player should know, including a cancelled action |
| `error`   | until dismissed; offers **Try again** when possible | an action failed                                               |

- One toast per action, updated in place by id. Never a new toast per status.
- At most three toasts visible. Duplicates collapse into one.
- A problem tied to one input (an invalid bid) shows next to that input, not as a toast.
- Things the player can already see change on screen (an opponent's bid) do not also get a toast.

### Errors

Every error from the wallet, the contract or the Zama relayer passes through one translator in `src/lib/` that maps it to a player-facing reason from `copy.ts`. A contract custom error maps to a specific sentence ("Your bid has to be higher than four 5s"). A player cancelling in their wallet is `info`, never `error`.

## Plain language

Bluff is for everyone, not only people who know crypto. Player-facing text describes what happens in the game, never the technology behind it.

- Every player-facing string lives in the feature's `copy.ts` (lint: `react/jsx-no-literals`).
- `pnpm copy:check` (`scripts/check-copy.mjs`) rejects technical words in `copy.ts` files: transaction, gas, encrypt, decrypt, contract, token, testnet, signature, relayer, and the rest of its list. It also rejects raw addresses and dashes.
- The `fairness` feature is the one place that may use technical words, to explain the guarantees to the curious and to judges.

| Instead of                      | Say                                                          |
| ------------------------------- | ------------------------------------------------------------ |
| Connect wallet                  | Continue with Google, Continue with email, Use my own wallet |
| Transaction pending, confirming | Placing your bid…, Joining the table…                        |
| Sign the message, approve       | Confirm in your wallet                                       |
| Encrypted dice                  | Your dice are hidden. Only you can see them.                 |
| Decrypting                      | Revealing dice…                                              |
| cUSDT, ERC-7984, token          | Chips                                                        |
| `0x71C7…`                       | The player's name or nickname                                |
| Transaction reverted            | The specific reason, in words                                |
| User rejected request           | Cancelled                                                    |
| Sepolia, testnet                | Practice version                                             |

## Solidity and FHE

### Structure

- Solidity `0.8.27`, `evmVersion: cancun`, optimizer on. Pragma `^0.8.24`.
- One contract per file. Layout inside a contract, in order: type declarations, constants, immutables, state, events, errors, modifiers, constructor, external, public, internal, private functions, views last within each group.
- Never name a function after a JavaScript `Object.prototype` member (`valueOf`, `toString`, `constructor`, `hasOwnProperty`): ethers resolves those names to the built-in, not the contract function.
- Names: contracts and libraries in PascalCase, functions and variables in camelCase, constants in UPPER_SNAKE_CASE, private and internal state prefixed with `_`, events in past tense (`BidPlaced`), errors describe the failure (`BidNotHigher`).
- Custom errors only, never revert strings (solhint: `custom-errors`).
- Every state change emits an event. The app depends on events for live updates.
- Checks, effects, interactions. External calls come last.
- No `console.log` in contracts (solhint: `no-console`).
- Upgradeable contracts keep all state in one ERC-7201 namespaced struct (`bluff.storage.<Contract>`), reached through a private `_get<Contract>Storage()` accessor. This accessor is the only place inline assembly is allowed. Never declare plain state variables in an upgradeable contract.
- Each implementation's constructor only calls `_disableInitializers()`. `initialize` sets everything, including the Zama coprocessor config with `FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig())`, because `ZamaEthereumConfig`'s constructor never runs for a proxy.
- Every upgrade bumps `version()` and adds a reinitializer only when new state needs setting.
- Line length is Prettier's (120 columns for Solidity).

### FHE rules

- Import from `@fhevm/solidity/lib/FHE.sol` and inherit `ZamaEthereumConfig`. Read [docs.zama.org](https://docs.zama.org/protocol/solidity-guides) for the current API before using an operation.
- **Grant access every time an encrypted value is stored.** After every assignment of an encrypted value to state, call `FHE.allowThis`. Call `FHE.allow` for exactly the players who must read it, and no one else.
- **Never branch on an encrypted value.** Use `FHE.select`. An `if` on a decrypted value leaks it.
- **Randomness is generated onchain** with `FHE.randEuint*` inside a transaction. Bounded calls take a power of two; map to a die face with a documented, tested method.
- **Public reveals use the three-step flow:** `FHE.makePubliclyDecryptable`, the client fetches the clear values and proof, then the contract verifies with `FHE.checkSignatures`, with the handles in a fixed order and protection against submitting the same reveal twice.
- **Count the cost.** Every FHE operation spends HCU, and a transaction has a limit. Keep encrypted operations per transaction low, prefer scalar operands, and note the cost of new operations in the PR.
- **Inputs from players** come in as `externalEuint*` with a proof and are converted with `FHE.fromExternal`.

### Contract tests

- Every external function has tests for its success path and **every** revert path.
- Line coverage of `contracts/` (outside `mocks/`) stays at 95% or more and branch coverage at 90% or more (`pnpm --filter @bluff/contracts coverage:check`, in CI).
- Slither runs in CI and fails on any finding of medium severity or higher.
- CI checks every contract's storage layout against the version deployed on Sepolia (`validate-layout:sepolia`, reading `.openzeppelin/sepolia.json`).
- Tests run against the FHEVM mock (`fhevm.isMock`). Encrypted values are checked by decrypting them in the test with the right signer, and access is checked by proving the wrong signer cannot.
- Fixtures deploy fresh contracts for each test by calling the fixture directly. Do not use `loadFixture`: its snapshot reverts leave the FHEVM mock coprocessor ahead of the chain, which fails later decryptions with an invalid block range. No test depends on another's state.
- Sepolia tests live in `test/sepolia/` and run on demand, not in CI.

## Styling and UI kit

- Tailwind CSS v4 only, configured in `apps/web/src/app/globals.css`. No CSS-in-JS, no inline `style` except for values computed at runtime.
- Use theme tokens (`bg-background`, `text-muted-foreground`, `text-success`), never raw colour values in components. Change the palette in `globals.css`, in one place.
- Merge classes with `cn` from `@/lib/utils`. Never concatenate class strings by hand.
- Variants use `cva`, defined once beside the component.
- UI primitives come from shadcn (`pnpm dlx shadcn@latest add <name>`). Add a component the day a feature uses it, not before. Generated components may be edited; record why in the PR.
- Motion animates `transform` and `opacity` only and respects `prefers-reduced-motion`.
- Dark mode uses the `.dark` class and the `.dark` token block. Every component works in both.

## Performance

There is no Lighthouse gate in CI, but the page must still feel instant on a mid-range phone.

- Server Components first. Client JavaScript is the main cost; ship as little as possible.
- The game providers and the Zama SDK load only on routes that play. The landing page does not pay for them.
- The Zama SDK's WASM starts loading when the player reaches the lobby, so the first move does not wait for it.
- Heavy client code (animation-heavy sections, the dice roll) loads with `next/dynamic` or after interaction.
- The system font stack is the default. A web font goes through `next/font` with `display: "swap"`.
- Images through `next/image` with explicit `width`/`height` or `fill` plus `sizes`.

## Accessibility

- Every interactive element is reachable and usable by keyboard, with a visible focus ring.
- Every input has a label; icon-only buttons have an `aria-label` from `copy.ts`.
- Dice faces have a text alternative ("five"), not only pips.
- Status changes that matter (your turn, a bluff was called, you lost a die) are announced through an `aria-live` region.
- Text contrast meets WCAG AA in both themes.
- Motion respects reduced motion.

## Errors

- Handle an error where it happens: show the player a useful state, log it with context.
- No silent `catch`, no empty `catch`, no catch-and-return-a-default that hides a broken call.
- No dummy data or fallbacks standing in for a failed read.
- Every async UI has a loading state and an error state. Use `error.tsx` boundaries per route segment and `not-found.tsx` where a table can be missing.
- Never delete or weaken a failing test or assertion to get a green build.

## Testing

- Web: Vitest and Testing Library. Tests sit next to the code: `bid-panel.tsx` and `bid-panel.test.tsx`.
- Test behaviour through what the player sees (`getByRole`, `getByText`), not implementation details.
- A component test covers the success state, the empty state, the error state and the loading state where they exist.
- Hooks over TanStack Query are tested with `renderHook` and a test `QueryClient`, covering loading, success, error and an event-driven update.
- Bug fixes follow red-green: write a failing test that reproduces the bug, see it fail for the right reason, then fix.
- Anything touching chip amounts has exact tests with `bigint` values.
- Mocks only at the boundary (wallet, network, time, browser APIs). Never mock the module under test.
- Contracts: see [Contract tests](#contract-tests).

## Comments

This codebase has no comments. None, from anyone.

- No inline comments, no block comments, no JSDoc, no NatSpec, no commented-out code, no section banners, in TypeScript, JavaScript, CSS or Solidity.
- Code says what it does through names and structure. If code seems to need a comment, rename or restructure it.
- A reason worth recording goes in the pull request description, an ADR or `docs/`.
- No tool directives either (`eslint-disable`, `@ts-expect-error`). Fix the code.
- The only exceptions are machine-read lines: the Solidity licence line (`// SPDX-License-Identifier`), generated files, and the two annotations OpenZeppelin's upgrade checker reads, exactly as `/// @custom:storage-location erc7201:<namespace>` and `/// @custom:oz-upgrades-unsafe-allow constructor`.

`pnpm comments:check` (`scripts/check-comments.mjs`) runs on every commit and in CI and rejects every other comment.

## Naming

- Files and folders: kebab case (`bid-panel.tsx`, `use-place-bid.ts`). Solidity files match their contract (`Bluff.sol`).
- Components: PascalCase. Hooks: `useCamelCase`. Constants: `UPPER_SNAKE_CASE` only for true module-level constants.
- Names say what a thing is: `BidPanel`, `formatChipAmount`, `usePlaceBid`. Never `Card2`, `utils2`, `handleStuff`, `data`.
- Booleans read as questions: `isMyTurn`, `hasChips`, `canCallBluff`.
- Event handler props are `onX`; the functions handling them are `handleX`.

## Dependencies and cleanup

The codebase holds only what it uses. Every package, file, export and config entry has a current caller.

- **Add a package only when the change that uses it lands.** No "we'll need it later" installs.
- Before adding a package, check whether the platform or an existing dependency already does the job. Prefer small, maintained, typed packages. Record the reason in the PR.
- Pin exact versions. Dependabot proposes updates; one upgrade per PR.
- The Zama packages (`@fhevm/*`, `@zama-fhe/*`) move together, to versions the FHEVM Hardhat plugin supports. Upgrade them in one PR after checking Zama's changelog.
- **When an implementation replaces another, the same change removes the old one completely:** its files, exports, styles, tests, assets, routes, environment variables, config entries, and every package only it used.
- `pnpm knip` must report nothing. It runs on pre-push and in CI.
- After removing packages, run `pnpm install` and commit the lockfile.

## Security

- No secrets in the repository. `.env*` files are git-ignored; gitleaks runs in CI.
- The deployer mnemonic and RPC keys live in Hardhat's encrypted variables (`npx hardhat vars set`), never in a file.
- Secrets for the web app live in Vercel environment variables. A secret never gets a `NEXT_PUBLIC_` prefix.
- Never render user input as HTML. No `dangerouslySetInnerHTML`.
- The contract treats every caller as hostile: check turn order, table membership and state on every call.
- Run `pnpm audit` before adding a dependency with a large install tree.

## Documentation

- Write for a reader new to the codebase: correct, clear, short. Define a term the first time you use it.
- Code samples in docs must run.
- The README covers the stack, the scripts and where to read next. Deep material lives in `docs/`.
- If a document is wrong, fix it in the same pull request that found it.
- No em dashes or en dashes in documentation either.
