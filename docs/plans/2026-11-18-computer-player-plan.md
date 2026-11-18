# Plan: the computer player

Builds [ADR-2026-11-18-computer-player](../adr/ADR-2026-11-18-computer-player.md) once both ADR files are approved. Target: merged by 2026-12-02, two days ahead of the 2026-12-04 slot in the [web app plan](2026-11-11-web-app-plan.md#9-build-order).

## Pull requests

Three, each usable on its own and each through `pnpm preflight`:

| PR      | Delivers                                                                                                                                       | Usable result                                            |
| ------- | ---------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| **8-1** | `packages/game` (`@bluff/game`): the bid rules, odds, table mapper and keeper duty moved out of `apps/web`, with the `Face` type               | Same app, one copy of the rules; nothing visible changes |
| **8-2** | `apps/bot` (`@bluff/bot`): the wallet pool, `/seat`, `/health`, the seat lifecycle, turns, strategy and keeper; esbuild bundle; Railway config | The service plays full games against a human on Sepolia  |
| **8-3** | `apps/web`: Play the computer, Play now renamed Quick play, the Computer badge, `NEXT_PUBLIC_BOT_URL`, the waking and refusal toasts           | Anyone can play the computer from the lobby              |

## Step 0: spike (before 8-1, about 30 minutes, nothing kept)

From Node 24, with a throwaway wallet the maintainer funds with a little Sepolia ETH:

1. `createConfig` with `node()` and a viem `mnemonicToAccount` wallet;
2. join a free table, start it with a second throwaway wallet, read `diceOf`, and decrypt the dice with `decryptValues`;
3. after a call, `decryptPublicValues(revealHandles)`, and `settleReveal` accepts it;
4. ask to decrypt the other wallet's die, and confirm the relayer refuses it.

The result is recorded in 8-2's PR description. If any step fails, stop and revisit the ADR.

## 8-1: `packages/game`

- **`packages/game/package.json`:** `@bluff/game`, private, `type: module`, exports `./src/index.ts`, and depends on `@bluff/contracts`. Scripts: `lint`, `typecheck`, `test` (Vitest).
- **Move, keeping their history (`git mv`), with their tests:**
  - `apps/web/src/lib/bid-rules.ts`;
  - `apps/web/src/lib/bid-odds.ts`;
  - `apps/web/src/features/table/lib/table-view.ts`;
  - `apps/web/src/features/table/lib/keeper-duty.ts`.
- **`Face`:** `src/face.ts` takes the type out of `dice-physics.ts`, which then imports it. The name stays `Face`, since `DieFace` is already a component in `components/shared/die.tsx`.
- **The web app:** every importer switches to `@bluff/game`, and `transpilePackages` gains `@bluff/game`.
- **Gates:** knip and the boundaries lint config learn the new package.
- **Tests:** the moved tests pass unchanged, and the full web suite passes.

## 8-2: `apps/bot`

```
apps/bot/
├── src/
│   ├── main.ts            starts the HTTP server and resumes seats
│   ├── config.ts          typed environment, refusing to start on anything missing or invalid
│   ├── chain.ts           viem clients; the Zama SDK with node()
│   ├── player-pool.ts     the bank and up to 20 players: reuse, bring in, fund, name, free/busy
│   ├── chain-watch.ts     one 2 s poll of Bluff's events for every seated table
│   ├── server.ts          POST /seat, GET /health, CORS, per-IP rate limit
│   ├── seat-policy.ts     the onchain checks before joining
│   ├── seat-runner.ts     one seat's lifecycle and the 5-minute parking rule
│   ├── turn.ts            thinking delay, deadline guard, own-dice decryption, send-if-still-mine
│   ├── own-dice.ts        values 0..5 → Face, rejecting anything else
│   ├── strategy.ts        opening, call, raise, bluff; thresholds; injected random
│   ├── keeper.ts          shared keeperDuty, staggered, still-due check, public reveal
│   └── log.ts             JSON lines, with no dice, secrets or keys
├── build.mjs              esbuild bundle → dist/main.js
├── package.json           @bluff/bot; esbuild pinned
└── railway.json           build and start commands, health check, sleep
```

- **Tests sit next to each module,** as in the ADR's Verification. The chain, relayer, clock and randomness are the only mocks.
- **The live check on Sepolia** uses the maintainer's Railway deploy, or a local `node dist/main.js` with the same environment.

## 8-3: `apps/web`

- **`features/lobby`:** Play the computer, built on `useSitDown`'s create path, then a `useSeatComputer` call. Play now becomes **Quick play**: `lobbyCopy.playNow` and its working text in `features/lobby/copy.ts`, `tableCopy.playNow` (the empty Your games page) and `features/design/copy.ts`. The label changes; the behaviour doesn't.
- **`features/table`:** the Computer badge on seats, history and details.
- **`hooks/use-seat-computer.ts`:** `POST /seat` with 3 retries over about 20 s, through the shared action status.
- **`config/computer-players.ts`:** the 20 players' public addresses (derived, listed by `/health`). `config/env.ts` gains `NEXT_PUBLIC_BOT_URL`.
- **`copy.ts`:** the button labels, the badge, "Waking the computer…" and each refusal.
- **Tests:** Play the computer through success, waking, a person taking the seat first, refusal and failure; the badge; the env check; Quick play's existing tests, updated for the new name.

## What the maintainer sets up (never pasted in chat)

1. **A Railway account** (the trial needs no card), and Hobby before the trial ends.
2. **A new secret phrase for the computers,** made offline and stored by you. It goes only in Railway's `BOT_MNEMONIC`.
3. **A server-side Sepolia RPC key** (Alchemy, not domain-limited) in Railway's `SEPOLIA_RPC_URL`.
4. **About 0.3 Sepolia ETH for the bank address** (account 0), which `/health` shows after the first deploy. The bank funds the players itself.
5. **`NEXT_PUBLIC_BOT_URL`** in `apps/web/.env.local`, and later in Vercel.

## Removed

- **Moved, not copied:** `apps/web`'s `bid-rules.ts`, `bid-odds.ts`, `table-view.ts` and `keeper-duty.ts`, with their tests.
- **The `Face` type in `dice-physics.ts`,** now in `@bluff/game`.
- **The superseded plan section** [2026-11-11-web-app-plan.md, section 10](2026-11-11-web-app-plan.md#10-the-computer-player) gets a one-line pointer to this plan.
