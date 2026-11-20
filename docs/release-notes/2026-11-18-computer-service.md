---
date: 2026-11-18
branch: feat/computer-service
base: dev
scenario-impact: needs_automation
---

# The computer player service: `apps/bot`

PR 8-2 of the [computer player plan](../plans/2026-11-18-computer-player-plan.md), building the approved [ADR-2026-11-18-computer-player](../adr/ADR-2026-11-18-computer-player.md). A Node 24 service that seats computer players at free tables and plays full games, decrypting only its own dice. **No contract change.** The lobby's Play the computer button comes in 8-3.

## Changes

- **New `apps/bot` (`@bluff/bot`):** pure decision modules, and a thin chain adapter.
  - **`strategy.ts`:**
    - opens with the biggest bid that's at least even odds;
    - calls below a 35% chance, or when no raise exists;
    - raises to the most likely bid, with the lower one winning ties;
    - bluffs on 15% of raises, on a face it holds none of.
    - It's built on `@bluff/game`'s `legalBids` and `bidChance`.
  - **`seat-policy.ts`:** joins only a free, public, waiting 2-seat table with one player and at least a minute before its waiting deadline.
  - **`seat-intent.ts` and `seat-runner.ts`:** one seat's life.
    - It gets ready (again after a reopen), and leaves if alone or not started within 5 minutes.
    - On its turn it thinks for 2 to 6 s, decrypts its own dice with a time limit, re-checks the table, and makes one move per turn. If the dice can't be read, it lets the turn lapse and logs it.
    - It keeps the table moving with the shared `keeperDuty`.
  - **`player-pool.ts`:** a bank (account 0) and up to 20 computer players, accounts 1 to 20 of `BOT_MNEMONIC`.
    - A free player is reused first; otherwise the next is brought in, funded and given its name and face.
    - Players are topped up below 0.01 ETH, and new games pause while the bank is below 0.05 ETH.
    - The names run from Baba Dice to Kemi Dice, plus 4 spares.
    - After a restart, seated players resume.
  - **Ready before reporting:** `POST /seat` answers only after the computer has joined **and** got ready, so a player never sees it "Not ready". The table is read at a known block and the join is dry-run at that same block, with join stumbles retried for up to 15 s.
  - **`seat-service.ts` and `server.ts`:** `POST /seat` and `GET /health`, on Node's `http`, with an origin allowlist, 5 requests per IP per 10 minutes, and refusals as `409 { reason }`. A table not yet visible is retried for 15 s.
  - **`chain-watch.ts`:** one 2 s event search for every seated table, in 10-block spans (Alchemy's free limit), plus a sweep every 10 s. When a lagging server can't search yet, it reads every seated table instead.
  - **`chain.ts`:** viem and `@zama-fhe/sdk/node`, with one SDK and wallet per player.
    - Moves are sent one at a time per wallet, as `encodeFunctionData` (no type casts).
    - Each move is dry-run at the newest seen block, and refusals are decoded from the game's ABI (`revert.ts`).
  - **`config.ts`:** validates the environment, including the secret phrase's BIP-39 checksum, and never repeats a secret in an error.
  - **`log.ts`:** JSON lines limited to an allowlist of fields, so dice, phrases and keys can't be written.
- **Build:** esbuild bundles `dist/main.js`, keeping viem and the Zama SDK external. `scripts/smoke.sh` checks the bundle loads and refuses to start without its settings. The root `build`, `pnpm preflight` and CI now build and smoke-test the bot.
- **knip** learns the `apps/bot` workspace.
- **Docs:** `docs/architecture.md` lists `apps/bot` and its Railway settings. The settings go in Railway's dashboard, because `railway.json` stops being read for new services on 2026-12-01.

## Removed

- The plan's `railway.json`, which was never added, since Railway's config-as-code is deprecated. The dashboard settings are documented instead.

## Verification

- **Vitest:** 118 tests across 12 files. Each live bug below was reproduced by a failing test before its fix.
- **Live on Sepolia, against Mark (Google), with the service run locally:**
  - **First seat:** funded, named Baba Dice, given its face and joined in 44 s; later seats took 7 to 17 s.
  - **Restart:** it resumed its seat from `tableOf` and readied up.
  - **Game 4:** Baba Dice took all 5 of its turns (3 bids, 2 calls), each 21 to 26 s from its turn starting to its move landing, and won. Reveals settled, and the seat was freed at the end.
- **Live bugs found and fixed:**
  1. the first read came before its own join, so it gave up its seat;
  2. a decryption with no time limit stalled a turn silently;
  3. events were missed when public-node servers disagreed;
  4. the pre-move re-check read an old block;
  5. it retried a reveal that was already settled;
  6. a just-made table wasn't found, and dry runs were checked against a lagging latest block;
  7. new blocks weren't recorded while busy, so a settled reveal trapped it.
  8. the join's dry run used a lagging "latest" block and failed with "Execution reverted for an unknown reason" (now pinned to the block the table was read at, and retried).
