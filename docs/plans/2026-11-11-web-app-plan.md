# Web app plan

## 1. Scope

The website players use: sign-in, first-time setup, chips, the lobby, the waiting room, the game, results, watching and the fairness panel. It runs against the contracts deployed on Sepolia ([contracts.md](../contracts.md)).

Implements these ADRs:

- [The web app](../adr/ADR-2026-11-11-web-app.md) (approved)
- [Client state and action feedback](../adr/ADR-2026-11-10-client-state-and-action-feedback.md) (approved)
- [Onboarding with Privy](../adr/ADR-2026-11-10-onboarding-with-privy.md) (approved, spike passed)
- [Game flow and timing](../adr/ADR-2026-11-10-game-flow-and-timing.md) (approved)
- [Chips and buy-ins](../adr/ADR-2026-11-11-chips-and-buy-ins.md) (approved)
- [Look, feel and sound](../adr/ADR-2026-11-11-look-feel-and-sound.md) (approved)
- [The computer player](../adr/ADR-2026-11-11-computer-player.md) (approved)

Out of scope: contract changes other than the `ChipFaucet` avatar upgrade (section 7), hosting setup (waits for Vercel, about 2026-11-28), the demo video and the X post.

## 2. Files

All under `apps/web/src/` unless noted. Folders appear in the pull request that first needs them (section 9).

```
packages/contracts/
├── scripts/export-abis.mjs           writes exports/abis.ts from the artifacts, run by `pnpm compile`
├── exports/
│   ├── abis.ts                       generated, git-ignored: bluffAbi, bluffCashierAbi, chipFaucetAbi, chipTokenAbi (as const)
│   └── index.ts                      re-exports the ABIs and deployments/sepolia.json, typed
└── package.json                      "exports": { ".": "./exports/index.ts" }

apps/web/public/
├── audio/                            effects (Opus and AAC, under 30 KB each), music loops (under 400 KB), CREDITS.md
├── models/                           board, cup and die (glTF, under 200 KB together)
└── textures/                         wood, cloth and pattern maps (WebP or KTX2)

apps/web/src/
├── app/
│   ├── page.tsx                      landing (exists): adds Play now and How to play
│   ├── how-to-play/page.tsx          server-rendered rules
│   └── (game)/
│       ├── layout.tsx                loads providers.tsx, the app header and the toaster
│       ├── providers.tsx             "use client": Privy ─► wagmi ─► QueryClient ─► Zama
│       ├── error.tsx                 route-group error boundary
│       ├── play/page.tsx             lobby
│       ├── welcome/page.tsx          first-time nickname and chips
│       ├── profile/page.tsx          avatar, name, chips, record, settings
│       ├── table/[id]/page.tsx       waiting room, game, results, watching
│       ├── table/[id]/not-found.tsx  unknown table
│       └── fairness/page.tsx         how this is fair
├── config/
│   ├── env.ts                        typed public env: NEXT_PUBLIC_PRIVY_APP_ID, NEXT_PUBLIC_SEPOLIA_RPC_URL
│   ├── chain.ts                      Sepolia, the transport list
│   └── contracts.ts                  addresses and ABIs from @bluff/contracts
├── lib/
│   ├── sound.ts                      Web Audio: decode once, play, volume, mute; no library
│   ├── dice-physics.ts               cannon-es throw and settle; turn a settled die to a given face
│   ├── seat-layout.ts                which board side each seat takes for 2, 3 and 4 players
│   ├── utils.ts                      cn (shadcn)
│   ├── query-client.ts               QueryClient defaults: retry with backoff, keepPreviousData
│   ├── transport.ts                  viem fallback transport: keyed provider, then public RPC
│   ├── block-clock.ts                newest seen block; pinned read options; waitForBlock
│   ├── notify.ts                     the only Sonner caller: one toast per action, timing rules
│   ├── errors.ts                     wallet, contract and relayer errors ─► reasons from copy
│   ├── errors.copy.ts                the reasons, in plain words
│   ├── chips.ts                      CHIP = 1_000_000n; formatChips(bigint) ─► "10 chips"
│   └── player-tag.ts                 tagOf(address) ─► "#4E31"; displayName(nickname, address)
├── hooks/
│   ├── use-action.ts                 the action status model and its timing rules
│   ├── use-block-clock.ts            subscribes to new blocks, feeds block-clock
│   ├── use-countdown.ts              seconds left to a deadline, ticking each second
│   ├── use-decrypt-with-retry.ts     wraps the Zama SDK decrypt hooks: retry every 2 s up to 30 s
│   ├── use-sound.ts                  play(effect); respects the Sounds switch and the first-tap rule
│   ├── use-music.ts                  lobby and table loops; respects the Music switch
│   └── use-settings.ts               Music, Sounds, motion: useSyncExternalStore over localStorage
├── components/
│   ├── ui/                           shadcn primitives as used: button, card, dialog, input, label,
│   │                                 radio-group, skeleton, sonner, badge, tooltip, separator
│   ├── layout/app-header.tsx         logo, avatar and name, cowrie balance, drum (sound) and settings icons
│   └── shared/
│       ├── action-button.tsx         raised 3D tile bound to a useAction status
│       ├── raised-card.tsx           tilting card with depth and a pattern frame
│       ├── pattern-frame.tsx         frames from the adire-style SVG motifs
│       ├── icons/                    the sourced icons (Kenney CC0, 3dicons CC0) as components: profile, settings, sound on and off, cowrie,
│       │                             leave, invite, watch, how to play (SVG components)
│       ├── avatar.tsx                a player picture from the set of 12: the chosen one, or one picked from the address
│       ├── chip-amount.tsx           a bigint shown as chips
│       ├── player-name.tsx           nickname + tag
│       ├── countdown.tsx             a visible, announced countdown
│       ├── die.tsx                   one die face in CSS 3D, with a text alternative ("five")
│       ├── tumbling-die.tsx          the landing page's CSS 3D die
│       ├── empty-state.tsx
│       ├── error-state.tsx           message + Try again
│       ├── live-region.tsx           the aria-live announcer
│       ├── toast-tile.tsx            the 3D tile every notify toast renders
│       ├── game-dialog.tsx           the carved panel and bottom sheet every dialog uses
│       └── next-step-line.tsx        the one sentence above the dock, also announced
└── features/
    ├── landing/                      exists: Play now, How to play links
    ├── account/                      sign in, sign out, session, permit, nickname
    ├── chips/                        balance, claim, "not enough chips"
    ├── lobby/                        play now, create, open tables, join with a link
    ├── table/                        waiting room, game, reveal, results, keeper, watching
    │   └── components/board/         the 3D table: canvas, board, cups, dice, physics, camera,
    │                                 and the CSS 2.5D fallback board sharing its layout constants
    ├── settings/                     Music, Sounds and motion switches; day and night
    └── profile/                      avatar picker, name, record (games played and won)
    └── fairness/                     the technical explanation, the only place technical words are allowed
```

Other files that change:

| File                            | Change                                                                                                                                              |
| ------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/package.json`         | `@bluff/contracts: workspace:*` and the packages below, pinned                                                                                      |
| `apps/web/next.config.ts`       | `transpilePackages: ["@bluff/contracts"]`; Zama WASM handling if the build needs it                                                                 |
| `apps/web/eslint.config.mjs`    | `@tanstack/eslint-plugin-query` rules; `@zama-fhe/*` and wagmi imports allowed only in `hooks/`, `features/*/hooks/` and `app/(game)/providers.tsx` |
| `.github/workflows/ci.yml`      | `pnpm compile` before `pnpm build` in the build job                                                                                                 |
| `.env.example` (apps/web)       | the two public variables, with where to get them                                                                                                    |
| `docs/architecture.md`          | the `(game)` route group, the keeper, block pinning; cashing out in the `chips` row                                                                 |
| `docs/how-to-play.md`           | chips: 100 every 24 hours, no balance rule                                                                                                          |
| `docs/engineering-standards.md` | block-pinned reads; where SDK imports are allowed                                                                                                   |

### Packages

| Package                                                                  | Why                                                             | Added in        |
| ------------------------------------------------------------------------ | --------------------------------------------------------------- | --------------- |
| `@privy-io/react-auth`                                                   | Google and email sign-in, embedded wallet, sponsorship          | PR 1            |
| `@privy-io/wagmi`                                                        | Privy as a wagmi connector                                      | PR 1            |
| `wagmi`, `viem`                                                          | reads, writes, events, the fallback transport                   | PR 1            |
| `@tanstack/react-query`                                                  | the cache everything reads through                              | PR 1            |
| `@tanstack/eslint-plugin-query`                                          | lint for query keys and options (dev)                           | PR 1            |
| `sonner`                                                                 | toasts, behind `notify`                                         | PR 1            |
| `@zama-fhe/sdk`, `@zama-fhe/react-sdk`                                   | encrypt the buy-in, reveal own dice and balance, public reveals | PR 2            |
| `three`, `@react-three/fiber`, `@react-three/drei`, `@types/three` (dev) | the 3D board and dice on the table screen only                  | PR 5            |
| `cannon-es`                                                              | dice physics                                                    | PR 5            |
| `motion`                                                                 | UI motion: tiles, cards, dialogs, toasts, the bid grid          | PR 0            |
| `@lottiefiles/dotlottie-react`                                           | celebration animations                                          | PR 5            |
| `@solana/kit` 8.x                                                        | only if Privy's optional Solana modules still break the build   | PR 1, if needed |

Versions are the newest past pnpm's release-age gate on the day each is added.

## 3. Interfaces

### Domain types

```ts
type TableStatus = "waiting" | "verifying" | "playing" | "revealing" | "finished" | "cancelled";

interface Seat {
  player: Address;
  dice: number;
  missedTurns: number;
  isActive: boolean;
}

interface Bid {
  quantity: number;
  face: 2 | 3 | 4 | 5 | 6;
  bidder: number;
}

interface Table {
  id: bigint;
  host: Address;
  status: TableStatus;
  isPrivate: boolean;
  seatCount: 2 | 3 | 4;
  dicePerPlayer: number;
  diceInPlay: number;
  buyIn: bigint;
  createdAt: number;
  startedAt: number;
  deadline: number;
  round: number;
  turn: number;
  roundStarter: number;
  bid: Bid | null;
  caller: number | null;
  seats: Seat[];
  readAtBlock: bigint;
}

type Face = 1 | 2 | 3 | 4 | 5 | 6;
```

`lib/` mappers turn `getTable` tuples into `Table` (enum index to `TableStatus`, `bidQuantity === 0` to `bid: null`) and are unit-tested with fixtures taken from the Sepolia run.

### Shared hooks

```ts
type ActionStatus =
  | { kind: "idle" }
  | { kind: "preparing" | "confirming" | "sending" | "waiting"; startedAt: number }
  | { kind: "done"; blockNumber: bigint }
  | { kind: "failed"; reason: string; retry: (() => void) | null };

function useAction<TArgs extends unknown[]>(options: {
  id: string;
  label: { working: string; done?: string };
  run: (ctx: ActionContext, ...args: TArgs) => Promise<TransactionReceipt>;
  optimistic?: (...args: TArgs) => () => void;
  quiet?: boolean;
}): { status: ActionStatus; visible: VisibleStatus; start: (...args: TArgs) => void };

type VisibleStatus =
  | { kind: "ready" }
  | { kind: "pressed" }
  | { kind: "working"; message: string; busy: boolean }
  | { kind: "confirm-in-wallet" }
  | { kind: "done" }
  | { kind: "failed"; reason: string };

function useCountdown(deadline: number): { secondsLeft: number; expired: boolean };
function useDecryptWithRetry(handles: Handle[], contract: Address): DecryptResult;
```

- `ActionContext` gives `run` the wallet client, `waitForBlock` and an `encrypt` helper. A receipt advances the block clock.
- `quiet` actions (keeper moves) skip the toast unless they fail twice.
- `confirm-in-wallet` appears only for own-wallet players; Privy players skip straight to `working`.

### Feature public APIs (`index.ts`)

| Feature    | Exports                                                                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| `account`  | `SignInPanel`, `SignOutButton`, `RequireSession` (gate), `WelcomeForm`, `usePlayer()` ─► `{ status, address, nickname, displayName, isEmbedded }` |
| `chips`    | `ChipBalance`, `ClaimChipsButton`, `CashOutPanel`, `useChipBalance()`, `useCanAfford(buyIn)`                                                      |
| `lobby`    | `Lobby` (play now, create, open tables, join with a link)                                                                                         |
| `table`    | `TableScreen` (picks waiting room, game, reveal, results or watching from the status)                                                             |
| `fairness` | `FairnessPanel`, `FairnessLink`                                                                                                                   |
| `landing`  | `Hero` (exists)                                                                                                                                   |

Routes compose features and pass slots, so no feature imports another: `/play` renders `<Lobby chips={<ChipBalance />} />`, and `/table/[id]` renders `<TableScreen id={id} fairness={<FairnessLink />} />`.

### Feature hooks

| Hook                                                  | Reads or writes                                                                                                     | Contract                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `usePlayer`                                           | Privy session, `nicknameOf`, `tableOf`                                                                              | `ChipFaucet`, `Bluff`                                                                                                       |
| `usePermit`                                           | one permit for `Bluff` and the chip token                                                                           | Zama SDK `useHasPermit`, `useGrantPermit`                                                                                   |
| `useSaveNickname`                                     | `setNickname` (or `claim(nickname)` on the first visit)                                                             | `ChipFaucet`                                                                                                                |
| `useChipBalance`                                      | own balance, decrypted                                                                                              | Zama SDK `useConfidentialBalance`                                                                                           |
| `useClaimChips`, `useNextClaim`                       | `claim`, `nextClaimAt`                                                                                              | `ChipFaucet`                                                                                                                |
| `useCashOut`, `usePendingCashOut`, `useDollarBalance` | unwrap chips and finish with the public reveal; resume an interrupted one; the mock USDT `balanceOf`                | chip token through `useSendMove`, Zama SDK `useEncrypt` and `useDecryptPublicValues`; event `PotPaid` refreshes the balance |
| `useOpenTables`                                       | `openTableCount`, `openTables(offset, limit)` + `getTable`                                                          | `Bluff`, events `TableListed`, `TableUnlisted`, `PlayerJoined`                                                              |
| `useCreateTable`, `useJoinTable`, `usePlayNow`        | `createFreeTable`, `joinFreeTable`, or encrypt + `confidentialTransferAndCall` to the cashier                       | `Bluff`, chip token                                                                                                         |
| `useTable(id)`                                        | `getTable`, pinned to the block clock                                                                               | `Bluff`, every event for this id                                                                                            |
| `useOwnDice(id)`                                      | `diceOf`, decrypted with retry                                                                                      | `Bluff`                                                                                                                     |
| `useStartTable`, `useLeaveTable`, `useCancelTable`    | the matching functions                                                                                              | `Bluff`                                                                                                                     |
| `usePlaceBid`, `useCallBluff`                         | `placeBid`, `callBluff`, optimistic turn change                                                                     | `Bluff`                                                                                                                     |
| `useReveal(id)`                                       | `revealHandles`, public reveal with retry                                                                           | `Bluff`, Zama SDK `useDecryptPublicValues`                                                                                  |
| `useTableKeeper(id)`                                  | `confirmSeats`, `settleReveal`, `claimTimeout`, `cancelVerification`, `cancelStuckReveal`, `cancelTable`, staggered | `Bluff`                                                                                                                     |
| `useRoundResult(id)`                                  | the last `RoundSettled` event: faces, count, who lost a die                                                         | `Bluff`                                                                                                                     |

## 4. State

| State                               | Owner                                                                                                                                              | Hook kind (standards table)            |
| ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------- |
| Table, seats, bid, turn, deadlines  | `useTable`: `useQuery` + `setQueryData` from events, pinned                                                                                        | contract state + live events           |
| Newest seen block                   | `block-clock` module, fed by `useBlockClock`                                                                                                       | external store, `useSyncExternalStore` |
| Own dice                            | Zama SDK cache through `useOwnDice`; memory only                                                                                                   | Zama SDK hook                          |
| Chip balance                        | Zama SDK `useConfidentialBalance`; refetched after a claim, a buy-in, a refund or a payout event                                                   | Zama SDK hook                          |
| Bid being composed (quantity, face) | `useBidDraft` with `useReducer`                                                                                                                    | several related values                 |
| Whether a bid is allowed            | computed in render from the draft and `table.bid`, using `lib/bid-rules.ts` (a TypeScript mirror of `BidRules.sol`, tested against the same cases) | derived                                |
| Pending own move                    | `useOptimistic` inside `usePlaceBid` and `useCallBluff`                                                                                            | optimistic                             |
| Each action's progress              | `useAction`                                                                                                                                        | shared action hook                     |
| Countdowns                          | `useCountdown`                                                                                                                                     | timer in a hook                        |
| Keeper schedule                     | `useTableKeeper`: `useEffect` with cleanup over the table state; timers in refs                                                                    | external system (timers, chain)        |
| Nickname suggestion                 | `useNicknameSuggestion` with `useState`, seeded from a list                                                                                        | one piece of UI state                  |

Every write goes through `useAction`:

| Action                   | Working message         | Done                    | Quiet |
| ------------------------ | ----------------------- | ----------------------- | ----- |
| Claim chips (first time) | Getting your chips…     | 100 chips added         | no    |
| Claim chips              | Getting your chips…     | 100 chips added         | no    |
| Cash out                 | Cashing out your chips… | Chips cashed out        | no    |
| Save nickname            | Saving your name…       | Name saved              | no    |
| Create a free table      | Setting up your table…  | none, the screen moves  | no    |
| Create a paid table      | Paying and setting up…  | none, the screen moves  | no    |
| Join a table             | Joining the table…      | none, the screen moves  | no    |
| Play now                 | Finding you a seat…     | none, the screen moves  | no    |
| Start                    | Starting the game…      | none                    | no    |
| Bid                      | Placing your bid…       | none, the bid shows     | no    |
| Call a bluff             | Calling the bluff…      | none, the reveal starts | no    |
| Leave                    | Leaving the table…      | You left the table      | no    |
| Cancel a waiting table   | Cancelling the table…   | Table cancelled         | no    |
| Keeper actions           | none                    | none                    | yes   |

## 5. Wording

Every string lives in the feature's `copy.ts` and passes `pnpm copy:check`. The full list ships with each pull request; these are the strings that set the tone.

```ts
export const accountCopy = {
  signInTitle: "Sit down and play",
  google: "Continue with Google",
  email: "Continue with email",
  ownWallet: "Use my own wallet",
  welcomeTitle: "Pick a name for the table",
  nicknameLabel: "Your name",
  nicknameHelp: "3 to 20 letters or numbers. Spaces, _ and - are fine.",
  suggestAnother: "Suggest another",
  welcomeSubmit: "Save and get 100 chips",
  nicknameInvalid: "Use 3 to 20 letters or numbers. Spaces, _ and - are fine.",
  noNickname: "Player",
  signOut: "Sign out",
} as const;

export const chipsCopy = {
  balance: (chips: string) => `${chips} chips`,
  claim: "Get 100 free chips",
  claimNext: "Free chips in",
  practiceNote: "Practice chips. They have no value.",
  wonInto: "Winnings go straight to your chips.",
  cashOut: "Cash out",
  cashOutAll: "Cash out everything",
  cashOutAmount: "How many chips",
  cashOutHelp: "Your chips become practice dollars you can see in any wallet.",
  cashOutResume: "Your last cash out did not finish. Finish it now",
  dollars: (amount: string) => `${amount} practice dollars`,
  notEnough: (chips: string) => `You need ${chips} chips for this table.`,
} as const;

export const lobbyCopy = {
  playNow: "Play now",
  createTable: "Create a table",
  seats: "Players",
  buyIn: "Chips to play",
  free: "Free",
  private: "Only people with the link",
  openTables: "Open tables",
  noOpenTables: "No open tables right now. Create one, or press Play now.",
  joinWithLink: "Have a link? Paste it here",
  quickGame: "Quick game",
  quickGameHelp: "Play the computer right now",
  playComputerInstead: "Nobody is free yet. Play the computer instead?",
  computerResting: "The computer is resting. Try Play now.",
  computerBadge: "Computer",
} as const;

export const tableCopy = {
  waitingFor: (n: number) => `Waiting for ${n} more ${n === 1 ? "player" : "players"}`,
  invite: "Copy invite link",
  start: "Start the game",
  checkingChips: "Checking everyone paid…",
  yourTurn: "Your turn",
  theirTurn: (name: string) => `${name} is thinking…`,
  yourDiceHidden: "Your dice are hidden. Only you can see them.",
  rolling: "Rolling your dice…",
  bid: (quantity: number, face: string) => `${quantity} × ${face}`,
  raise: "Bid",
  callBluff: (name: string) => `Call bluff on ${name}`,
  someoneBid: (name: string, quantity: number, face: string) => `${name} bid ${quantity} × ${face}`,
  calledYou: (name: string) => `${name} says you are bluffing!`,
  calledSomeone: (caller: string, bidder: string, bid: string) =>
    `${caller} called ${bidder}'s bluff on ${bid}`,
  mustBeHigher: (quantity: number, face: string) =>
    `Your bid has to be higher than ${quantity} × ${face}`,
  revealing: "Revealing dice…",
  roundResult: (count: number, face: string) => `There were ${count} × ${face}, counting ones`,
  lostADie: (name: string) => `${name} loses a die`,
  timeLow: "Ten seconds left",
  busy: "The network is busy. Hang on.",
  winner: (name: string) => `${name} wins`,
  youWon: (chips: string) => `You won ${chips} chips`,
  playAgain: "Play again",
  backToLobby: "Back to the lobby",
  watching: "You are watching this game",
  leave: "Leave the table",
  leaveWarning: "Leaving now means losing your chips for this game.",
} as const;
```

Dice faces are words in text alternatives ("five") and digits in the visible pips. Contract errors map to sentences in `lib/errors.copy.ts`, one per custom error, for example `NotYourTurn` ─► "It is not your turn yet", `AlreadyAtTable` ─► "You are already at a table. Finish or leave it first", `ClaimTooSoon` ─► "You can get more chips tomorrow". A wallet cancellation is `info`: "Cancelled".

## 6. Tests

Vitest and Testing Library, next to the code. Mocks only at the boundary: the wallet, the RPC transport, the Zama SDK and time.

| Test                                           | Proves                                                                                                                                                                                                                            |
| ---------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `lib/table-mapper.test.ts`                     | Sepolia fixtures map to `Table` correctly, including no bid, a finished game and a removed seat                                                                                                                                   |
| `lib/bid-rules.test.ts`                        | The same cases as `BidRules.sol`'s tests: higher bid, invalid face, quantity beyond the dice in play                                                                                                                              |
| `lib/block-clock.test.ts`                      | The clock only moves forward; an older read is dropped; `waitForBlock` resolves once the provider catches up                                                                                                                      |
| `lib/errors.test.ts`                           | Every Bluff, cashier and faucet custom error has a sentence; cancellation is info; unknown errors get a generic sentence and are logged                                                                                           |
| `lib/notify.test.ts`                           | One toast per id, updated in place; success 3 s, info 4 s, error until dismissed; at most three; duplicates collapse                                                                                                              |
| `lib/player-tag.test.ts`                       | Tag is the last four characters, upper case; no nickname gives "Player #4E31"                                                                                                                                                     |
| `lib/chips.test.ts`                            | Exact `bigint` formatting: 0, 1 chip, 10, 100, a remainder                                                                                                                                                                        |
| `hooks/use-action.test.ts`                     | Every transition; 100 ms response; nothing shown before 300 ms; shown at least 500 ms; busy after 15 s; retry; optimistic rollback                                                                                                |
| `hooks/use-countdown.test.ts`                  | Ticks down, stops at zero, survives a re-render                                                                                                                                                                                   |
| `hooks/use-decrypt-with-retry.test.ts`         | Retries every 2 s; succeeds on a later try with no error shown; fails after 30 s with a reason                                                                                                                                    |
| `table/hooks/use-table.test.ts`                | Loading, success, error; an event updates the cache without a refetch; an older block never wins                                                                                                                                  |
| `table/hooks/use-table-keeper.test.ts`         | Who goes first for each action; 8 s stagger by seat; the fresh-read check stops a duplicate; watchers never send; cleanup on unmount                                                                                              |
| `table/hooks/use-place-bid.test.ts`            | Optimistic bid shows at once and rolls back on failure; refused bids never reach the wallet                                                                                                                                       |
| `chips/hooks/use-cash-out.test.ts`             | Both steps in one action; an interrupted cash out is offered for resume; balances refresh after; exact `bigint` amounts                                                                                                           |
| `table/components/bid-picker.test.tsx`         | Every legal bid for 2 to 9 dice in play is in the grid and every illegal one is disabled; quick picks are legal; the top bid leaves only Call bluff; no Call bluff before the first bid; arrow keys skip dimmed cells; Enter bids |
| `table/components/action-dock.test.tsx`        | Shows only what you can do now, for every table status and whose turn it is                                                                                                                                                       |
| `components/shared/game-dialog.test.tsx`       | Focus is trapped and returned; Escape closes; bottom sheet on narrow screens                                                                                                                                                      |
| `profile/hooks/use-record.test.ts`             | Games played and won counted from `GameEnded` events, including ties                                                                                                                                                              |
| `lib/dice-physics.test.ts`                     | 600 seeded throws: every die settles within 2 s and shows the face it was given                                                                                                                                                   |
| `lib/seat-layout.test.ts`                      | 2, 3 and 4 players get the right sides; you are always at the bottom                                                                                                                                                              |
| `lib/sound.test.ts`                            | Nothing plays before the first tap; the Sounds and Music switches mute their channel; each file decodes once                                                                                                                      |
| `hooks/use-settings.test.ts`                   | Switches persist; a blocked storage still works for the session and logs a warning                                                                                                                                                |
| `table/components/board/board.test.tsx`        | No WebGL, a slow frame rate and reduced motion each render the CSS board; both boards show the same seats, cups and bid                                                                                                           |
| `components/shared/action-button.test.tsx`     | Pressed within 100 ms; working message rules; a danger variant; keyboard activation                                                                                                                                               |
| `packages/contracts/test/sepolia/full-game.ts` | Also reads the winner's balance before and after the paid game, and checks it grew by the pot                                                                                                                                     |
| Component tests                                | Each screen's loading, empty, error and success states: lobby, open tables, waiting room, game, reveal, results, welcome                                                                                                          |
| Accessibility tests                            | Labels on every input; icon buttons named; the live region announces your turn, a call and a lost die                                                                                                                             |

Manual, per pull request: the change used in the running app, signed in with Google and with an own wallet, in light and dark mode, at phone width. Before submission: timed 2, 3 and 4-player games on Sepolia.

## 7. Look, feel and sound

The full decision, including where every library and asset comes from and under which licence, is in [Look, feel and sound](../adr/ADR-2026-11-11-look-feel-and-sound.md#sourced-not-hand-made). The short version: a mahogany Ludo-style board in red, green, yellow and blue, players on their own sides with calabash cups, cowries for chips, raised 3D tiles for buttons, adire-style frames, game and 3D icons (Kenney, 3dicons), Nigerian display type, real tumbling dice, and talking drum and shekere music and effects with their own switches.

### The journey and the screen

Nothing should need figuring out. These rules apply to every screen and are checked in every pull request's review.

- **The board is the centre.** On a phone, a tablet or a laptop, the board sits in the middle of the screen and keeps its square shape. Everything else is arranged around it: the top bar (round, game clock, pot, sound), the players on their sides, and the **action dock** under the board.
- **Your move lives in one place.** The action dock is always at the bottom centre, within thumb reach on a phone. It holds only what you can do right now: the bid picker and **Call bluff** on your turn; "Sly Fox is thinking…" and their countdown otherwise; **Start the game** or **Copy invite link** in the waiting room; **Play again** at the end.
- **One line tells you what to do.** Above the dock, a single sentence names the next step: "Your turn: raise the bid or call bluff", "Waiting for 1 more player. Share your link", "Revealing dice…". It's also announced through the live region.
- **Two taps to anything that matters.** From the lobby: Play now is one tap; Create a table is two (open, then create); joining an open table is one. In a game: a quick bid is one tap, any other bid two, and Call bluff one.
- **Nothing important behind a menu.** Leave, sound and settings are visible icons in the top bar with labels on hover and focus. Menus hold only rare things (sign out).
- **Empty seats invite.** An empty seat on the board shows an **Invite** button that copies the table link.
- **Every wait is explained.** Every working state says what is happening, in the words from section 4, and after 15 seconds adds that the network is busy.
- **First game, three tips.** The first time a player sits down, three short tips point at the bid picker, Call bluff and their own dice. Each can be dismissed, and they never show again.
- **Back is always there.** Every screen has a way back to the lobby; leaving a game in progress asks first (section 5, `leaveWarning`).
- **Layouts:**
  - **Phone, portrait:** top bar, then the board (full width), then the dock.
  - **Phone, landscape, and tablet:** the board in the middle, the dock under it, the players on the board's edges.
  - **Laptop:** the board in the middle at up to 720 px, the dock under it, and the round history (bids so far) in a slim panel on the right that can be collapsed.

### The bid picker

Every legal bid is on screen at once, and nothing illegal can be chosen.

```
 Current bid: 4 × five                         Your dice that count for fives: 2
┌──────────────────────────────────────────────────────────────┐
│  Quick:  [ 4 × six ]   [ 5 × two ]   [ 5 × five ]              │  one tap = that bid, selected
├──────────────────────────────────────────────────────────────┤
│        ⚁     ⚂     ⚃     ⚄     ⚅                               │
│  4     ·     ·     ·     ·    [ ]          dimmed: not higher    │
│  5    [ ]   [ ]   [ ]   [■]   [ ]          ■ = your selection    │
│  6    [ ]   [ ]   [ ]   [ ]   [ ]                                │
│  7    [ ]   [ ]   [ ]   [ ]   [ ]          rows up to the dice   │
│  8    [ ]   [ ]   [ ]   [ ]   [ ]          in play               │
├──────────────────────────────────────────────────────────────┤
│  [  BID 5 × FIVE  ]                   [ CALL BLUFF ]           │
└──────────────────────────────────────────────────────────────┘
```

- **The grid holds every bid.** Rows are quantities from 1 to the dice in play; columns are the faces 2 to 6. Bids that are not higher than the current one are dimmed and can't be chosen. Ones are not a column, because they are wild; a small note says "Ones count as every face".
- **It opens on the right row.** The grid scrolls to the first legal row, so the likely bids are under the thumb. On a laptop, all rows fit.
- **Quick picks.** Three one-tap suggestions above the grid: the same quantity with the next face, one more of the lowest face, and one more of the current face. A quick pick selects; the big button confirms.
- **Call bluff names who you are calling.** A call always challenges the last bid, so the button reads "Call bluff on Sly Fox", naming the player who made it.
- **The button says the bid.** "Bid 5 × five" is spelled out in words for the screen reader ("Bid five fives"). Before a selection it reads "Pick a bid".
- **Your own count helps.** "Your dice that count for fives: 2" updates as the selection changes. It counts your dice showing that face plus your ones, and only you see it.
- **The top bid.** When the bid already reaches every die in play showing six, the grid is replaced by "No higher bid is possible. Call the bluff", and only Call bluff remains.
- **First bid of a round.** Call bluff is hidden until a bid exists, and the line above says "You start. Make the first bid".
- **Keyboard.** Arrow keys move through the grid, skipping dimmed cells; Enter bids; B calls the bluff.
- **The rules are shared.** The grid's legality comes from `lib/bid-rules.ts`, the TypeScript mirror of `BidRules.sol`, tested against the same cases. The contract stays the final check.

### Dialogs and other pages

- **Dialogs** use one `GameDialog` in `components/shared/`, built on the shadcn dialog: a carved wooden panel with a pattern frame and a raised close tile, rising in from below with a small settle while the board dims as if a lantern were lowered. On phones a dialog is a bottom sheet, within thumb reach. Focus is trapped, Escape closes, and the opening control gets focus back.
- **Dialogs in the app:** sign in, create a table, join with a link, invite, leave the table, cash out, settings, the first-game tips and the round result on small screens.
- **`/profile`:**
  - Your avatar, name and tag. The avatar is picked from Bluff's set of 12 illustrated faces: gele, fila, cap, beads and braids, in the four seat colours.
  - Your name, which you can change.
  - Your chips: the cowrie balance, a claim, and cash out.
  - Your record: games played and won, from `GameEnded` events.
  - Settings: Music, Sounds, motion, day or night.
- **Avatars need a small contract upgrade.** Other players must see the face you picked, so it's stored onchain. `ChipFaucet` 1.1.0 adds, at the end of its ERC-7201 struct, `mapping(address => uint8) avatars`, plus:
  - `setAvatar(uint8 avatar)`, which accepts 1 to 12 and works while paused;
  - `avatarOf(address)`, where 0 means "not chosen" and the app falls back to a face picked from the address;
  - the `AvatarSet(player, avatar)` event and the `InvalidAvatar(avatar)` error.

  The same upgrade stores uploaded pictures (section 7, "Avatar uploads"): `setAvatarImage(string cid)` saves an IPFS content id of at most 100 characters and clears the preset; `avatarOf` returns both, as `(uint8 preset, string cid)`; `AvatarSet(player, preset, cid)` covers both. One upgrade, not two.

  Hardhat tests cover setting, changing, rejecting 0 and 13, an empty or overlong content id, the event, and an upgrade from 1.0.0 that keeps every nickname and claim time. The upgrade runs through `upgrade:sepolia` after `validate-layout` passes, with `docs/contracts.md` updated. It ships in PR 2, before the profile page uses it.

- **Avatar uploads** (PR 9, near the end):
  - Every player starts with one of the 12 African preset faces. **Upload your own picture** on `/profile` replaces it.
  - The browser crops the photo square, shrinks it to 256 × 256 and saves it as WebP under 100 KB, so uploads are quick on mobile data.
  - The upload goes to Pinata (IPFS) through a one-time upload link. A route handler, `app/api/avatar-upload/route.ts`, makes that link with a server-only `PINATA_JWT`, after checking the request's signed message proves the address. The secret never reaches the browser.
  - The returned content id is saved with `setAvatarImage`. Pictures load through Pinata's gateway, sized for the seat.
  - Before uploading, the player reads: "Your picture will be public, and copies may stay online even if you change it later." They must tick a box to continue.
  - A **Report picture** action on other players' seats opens an email to the project with the content id. The owner unpins reported pictures in Pinata and adds the content id to `src/config/hidden-avatars.ts`, so the app shows the preset face instead.
- **Every page shares the look:** the pattern frame, raised tiles and cards, the icon set, and the board peeking at the bottom on pages without a game (`/play`, `/profile`, `/fairness`, `/how-to-play`).

### Design tokens

| Token                                                        | Day                                                          | Night                        |
| ------------------------------------------------------------ | ------------------------------------------------------------ | ---------------------------- |
| `--background`                                               | warm sand                                                    | deep indigo                  |
| `--board`                                                    | mahogany                                                     | mahogany under lantern light |
| `--seat-red`, `--seat-green`, `--seat-yellow`, `--seat-blue` | the four Ludo colours, tuned for AA contrast with white text | the same, slightly brighter  |
| `--tile`, `--tile-edge`                                      | raised tile face and its solid underside                     | the same, darker             |
| `--cowrie`                                                   | ivory                                                        | ivory                        |
| `--pattern`                                                  | indigo and ochre                                             | ochre and gold               |

Tokens live in `globals.css`, as the standards require. Components never use raw colours.

### Components with depth

- **`ActionButton`**: a raised tile, 6 px of underside; it presses to 2 px within 100 ms of the tap, plays the tap sound, and shows its working state from `useAction`. Variants: `primary` (the seat colour of the player), `danger` (Call bluff, in red with a drum hit), `quiet`.
- **`RaisedCard`**: lifts 4 px and tilts up to 6 degrees toward the pointer on desktop; lifts on tap on phones; no tilt with reduced motion.
- **`ToastTile`**: a wooden tile with a pattern edge; drops in from the top with a small settle, stacks up to three, follows the toast timing rules unchanged.
- **Icons**: one SVG set, two-tone with a highlight and a shadow layer to read as 3D at 24 to 48 px.

### Screens

```
 Landing (/)                                   Lobby (/play)
┌────────────────────────────────────────┐    ┌────────────────────────────────────────┐
│ ▓▓▓ pattern frame ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓ │    │ (face) Brave Otter #4E31  ◉ 120  🥁  ⚙ │
│        BLUFF                           │    │ ┌────────────────────────────────────┐ │
│   Roll in secret. Bid boldly.     ⬢    │    │ │         PLAY NOW  (raised tile)    │ │
│   Call out the liars.        (tumbling │    │ └────────────────────────────────────┘ │
│                                  die)  │    │  Chips to play  [Free][10][25][50]     │
│ ┌──────────────────────────────────┐   │    │  [ Create a table ] [ Have a link? ]   │
│ │        PLAY NOW  (raised tile)   │   │    │                                        │
│ └──────────────────────────────────┘   │    │  Open tables                           │
│ ┌────────┐ ┌────────┐ ┌────────┐       │    │  ┌────────────┐ ┌────────────┐         │
│ │ Roll in│ │ Bid    │ │ Call   │ tilt  │    │  │ 3 seats ◉10│ │ 2 seats    │ cards   │
│ │ secret │ │ boldly │ │ bluff  │ cards │    │  │ ●●○   Join │ │ Free ●○ Join│        │
│ └────────┘ └────────┘ └────────┘       │    │  └────────────┘ └────────────┘         │
│  ▔▔▔▔ the board peeks in below ▔▔▔▔    │    └────────────────────────────────────────┘
└────────────────────────────────────────┘

 The table (/table/12), a 4-player game, phone in portrait
┌────────────────────────────────────────┐
│ Round 3 · 11:20          ◉ pot 40   🥁 │
│          (face) Sly Fox  · yellow      │
│               [cup ▢▢]                 │
│  (face)  ┌──────────────────────┐ (face)│
│  Heron   │   mahogany board     │ Kola  │
│  green   │   ◉◉◉ cowrie pot     │ blue  │
│ [cup▢▢▢] │   bid: 4 × ⚄ (marker)│[cup▢] │
│          └──────────────────────┘       │
│               [cup ⚄ ⚀ ⚂ ⚅]            │
│          (face) You · red · 0:24        │
│ ┌──────────┐ ┌──────────────┐           │
│ │  − 5 +   │ │ ⚁ ⚂ ⚃ [⚄] ⚅  │  faces    │
│ └──────────┘ └──────────────┘           │
│ [  BID 5 × FIVE  ]   [ CALL BLUFF ]     │
└────────────────────────────────────────┘
```

On a call, every cup lifts, the dice roll across to their owners' sides, faces turn up in seat order, and the dice that count glow. The result line ("There were 5 × five, counting ones. Heron loses a die") sits on a toast tile, and the losing die rolls off that player's side.

Seat sides: you are always at the bottom (red, or your own colour if you choose one later). Two players face each other; three take bottom, left and right; four use every side.

States drawn for each screen: first load (a wooden skeleton of the board), empty (an empty board with "No open tables right now"), error (a toast tile with Try again), working (the pressed tile and its message), watching (every cup closed, "You are watching this game"), and the CSS fallback board.

### Motion

| Moment                 | Animation                                                       | Length                 | Sound                           |
| ---------------------- | --------------------------------------------------------------- | ---------------------- | ------------------------------- |
| Your dice are revealed | the cup shakes until the faces arrive, then the dice are thrown | throw and settle 1.2 s | cup shake, roll, settle on wood |
| An opponent rolls      | their cup shakes once                                           | 0.6 s                  | soft shake                      |
| A bid                  | the bid marker slides to the new count and face                 | 0.3 s                  | wooden knock                    |
| Call bluff             | the button sinks, the screen gives a small shake, cups lift     | 0.5 s                  | talking drum                    |
| The reveal             | dice roll to their owners' sides, faces turn up in seat order   | 2 to 3 s               | rolling, one tick per face      |
| A die is lost          | it rolls off that player's side and fades                       | 0.8 s                  | thud                            |
| Chips arrive           | cowries hop into the balance                                    | 0.6 s                  | cowrie rattle                   |
| A win                  | the winner's side lights up; cowries pour to them               | 2 s                    | celebration                     |
| Ten seconds left       | the countdown pulses                                            | each second            | tick                            |

Reduced motion: no throws, shakes or tilts; dice flip in place in 0.2 s, and other changes cross-fade.

### Sound

- Effects: shake, roll, settle, tap, knock, drum, rattle, thud, celebration, tick. Music: a lobby loop and a table loop.
- `lib/sound.ts` decodes each file once, on the first tap, and plays them through one gain node per channel.
- Settings: Music (off until turned on or the first tap, then remembered), Sounds (on by default), both in the header's drum icon and in settings.
- Sources, licences and approvals listed in `public/CREDITS.md`, with dice and chip sounds from Kenney's CC0 "Casino Audio" and percussion from Freesound or Pixabay Music. The owner signs off every sound in the design pass.

### The design pass (PR 0)

Before PR 1, a clickable prototype on its own route group, reviewed by the owner:

1. The board with four seats, cups and the cowrie pot, in day and night.
2. A die roll: the cup shake, the throw, landing on given faces, and the reveal.
3. `ActionButton`, `RaisedCard`, `ToastTile`, the icon set and the pattern frames.
4. The landing hero with the tumbling die.
5. A first set of sounds and a music loop, switchable.

Once approved, the prototype's pieces move into `components/shared/`, `lib/` and `features/table/components/board/`, and the prototype route is deleted in the same change.

### Reading events

Alchemy's free plan limits `eth_getLogs` to **10 blocks per request**, which was found on 2026-11-12. So:

- live updates use `watchContractEvent` from the current block, which stays within the limit;
- the lobby lists tables from the `openTables` and `getTable` views, not from past events;
- anything that needs history, like a player's games played and won, either reads it through the public Sepolia node (wider log range) in small windows, or comes from a contract view if one is added later. It never assumes the keyed provider can scan history.

## 8. Removal

- Done with this plan's pull request: `docs/how-to-play.md` drops the "fewer than 10 chips" rule ("You can get 100 more once a day"), and the Privy ADR now says server secrets stay in Vercel, not Cloudflare.
- Nothing in the web app exists yet that this replaces. The `(game)` prototype route from PR 0 is deleted in the pull request that moves its pieces into place.

## 9. Build order

Each pull request is usable on its own and goes through `pnpm preflight` and a manual check.

| PR  | Delivers                                                                                                                                                                                                                                                                                                                                                                                       | Usable result                                                    |
| --- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| 0   | The design pass: tokens, fonts, `ActionButton`, `RaisedCard`, `ToastTile`, icons, pattern frames, the board and dice prototype, first sounds and music; approved by the owner                                                                                                                                                                                                                  | The look is agreed before screens are built                      |
| 1   | Contract exports; `(auth)` and `(game)` route groups with shared providers; strict route protection (`proxy.ts`, `/api/session`, `/sign-in`, `/refresh`); env and transport; `notify` with toast tiles; header with name, tag and sign-out; sign in and sign out. The block clock and `useAction` move to the first PR that sends or reads game state (PR 2 and PR 3), so nothing ships unused | Sign in with Google, email or an own wallet and see your name    |
| 2   | Zama SDK and permit; `/welcome` with nickname suggestion and first claim; cowrie balance; daily claim; cash out, with resume; `ChipFaucet` 1.1.0 with avatars; `/profile`                                                                                                                                                                                                                      | A new player gets a name, a face and 100 chips, and can cash out |
| 3   | Lobby: open tables as cards (live), create free and paid tables, Play now, join with a link, "not enough chips"                                                                                                                                                                                                                                                                                | Players can find each other and sit down                         |
| 4   | Waiting room on the board: seats filling around the table, countdown, invite link, start, leave, cancel; keeper for the payment check and the waiting-room deadline                                                                                                                                                                                                                            | A table fills and starts, free or paid                           |
| 5   | The game on the 3D board: own dice with cup shake and throw, bid panel and marker, call, reveal, round result, timeouts, game clock, results, Play again; the CSS fallback board; keeper for reveals and timeouts                                                                                                                                                                              | A full game, start to finish                                     |
| 6   | Watching, `/fairness`, `/how-to-play`, the landing page with the tumbling die and tilting cards, metadata                                                                                                                                                                                                                                                                                      | Anyone can watch and learn why it is fair                        |
| 8   | The computer player: `apps/bot`, `packages/game`, Quick game and "Play the computer instead" in the lobby, the Computer badge, the Railway deploy                                                                                                                                                                                                                                              | Anyone can play alone, straight away                             |
| 9   | Avatar uploads: cropping, the upload route, Pinata, the public-picture notice, Report picture, hidden pictures                                                                                                                                                                                                                                                                                 | Players can use their own picture                                |
| 7   | Playtests and polish: timed 2, 3 and 4-player games, accessibility pass, reduced motion, budgets measured on a mid-range Android phone, final sounds, error copy review                                                                                                                                                                                                                        | Ready for the demo video                                         |

Target: PR 0 approved by 2026-11-16, PRs 1 to 4 by 2026-11-23, PR 5 by 2026-11-29, PR 8 (the computer) by 2026-12-02, PR 6 by 2026-12-04, PR 9 (uploads) by 2026-12-06, and PR 7 with staging on Vercel by 2026-12-09. That leaves five days before the 2026-12-14 deadline for the video, the X post and fixes. PR 7 is listed last in the table but runs last in time. The look adds about a week; if the schedule slips, the CSS board ships first and the 3D board follows, since both read the same state.

### What the maintainer sets up

- **Before PR 1:** a free Alchemy (or Infura) account with a Sepolia key, allowlisted for `localhost:3000` and later the Vercel domains. The key goes in `apps/web/.env.local` as `NEXT_PUBLIC_SEPOLIA_RPC_URL`, never in chat.
- **Before PR 1:** in Privy's dashboard, `http://localhost:3000` added to allowed origins.
- **When Vercel returns:** the same two variables in the Vercel project, and the Vercel domains added to both allowlists.
- **Before PR 8, around 2026-11-28:** a Railway account (the trial needs no card), a bot mnemonic, and test ETH for the bot.
- **Before PR 9:** a Pinata account and a JWT for `PINATA_JWT`, set in `.env.local` and later in Vercel, never in chat.
- **Before submission:** Google's consent screen published to production.

## 10. The computer player

The full decision is in [The computer player](../adr/ADR-2026-11-11-computer-player.md).

```
apps/bot/
├── src/
│   ├── main.ts            starts the server and the table watchers
│   ├── server.ts          POST /seat, GET /health; rate limit per address
│   ├── seat-policy.ts     the onchain checks before joining
│   ├── watcher.ts         follows the bot's tables through events, pinned reads like the web app
│   ├── turn.ts            on its turn: decrypt own dice, ask the strategy, send the move
│   ├── strategy.ts        binomial odds, call threshold, best raise, bluff rate
│   ├── keeper.ts          the same staggered duties as the web app's keeper
│   ├── wallet.ts          viem wallet from BOT_MNEMONIC; balance guard at 0.05 ETH
│   └── config.ts          typed environment: BOT_MNEMONIC, SEPOLIA_RPC_URL, ALLOWED_ORIGINS
├── package.json           @bluff/bot
└── railway.json           start command, health check, sleep after 10 minutes idle
```

- **Shared rules.** The bid rules and the table mapper move from `apps/web/src/lib` to a small shared package, `packages/game` (`@bluff/game`), in the same pull request, so the web app and the bot use one copy. It's pure TypeScript with its tests.
- **In the web app.** The lobby gets **Quick game**. Play now offers the computer after 30 seconds without a human. Seats whose address is in `config/computer-players.ts` show the "Computer" badge.
- **Tests:**
  - `strategy.test.ts`: odds against hand-computed cases, never an illegal bid, always calls an impossible bid, never calls a bid its own dice prove.
  - `seat-policy.test.ts`: every refusal.
  - `server.test.ts`: the endpoint, the rate limit, the health check.
  - `turn.test.ts`: the thinking delay, and a retried decryption.
- **Live check:** a human plays the bot on Sepolia, timed. The bot asking for the human's dice is refused by the relayer.
- **The owner sets up:** a Railway project from the repository, the three environment variables, a new mnemonic for the bot (made and stored by the owner, never pasted in chat), and the bot address funded with test ETH from the deployer.

## 11. After submission

Recorded so they aren't lost, and kept out of this plan's schedule:

- **Rebuy.** When a player loses their last die at a paid table, they may pay the buy-in again into the pot, once per game, within 20 seconds, to come back with one die. It needs a Bluff upgrade, its own rules ADR, and room in the contract, which has about 2 KB left under the size limit.
- **Pidgin.** A Pidgin version of every `copy.ts`.
- **Paid tables against the computer.**
- **Faster rounds** with bids signed off the chain (game flow ADR, "Making games shorter").
