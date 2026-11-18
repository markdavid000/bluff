---
date: 2026-11-18
branch: feat/computer-player
base: dev
scenario-impact: none
---

# One copy of the game rules: `@bluff/game`

PR 8-1 of the [computer player plan](../plans/2026-11-18-computer-player-plan.md), building the approved [ADR-2026-11-18-computer-player](../adr/ADR-2026-11-18-computer-player.md). The game's pure rules move out of the web app into a shared package, so the computer player (8-2) uses the same rules as the app. Nothing changes for players.

## Changes

- **New `packages/game` (`@bluff/game`):** pure TypeScript with its own lint, typecheck and Vitest, run by `pnpm preflight` and CI like the other packages.
  - **Exports** the bid rules (`legalBids`, `isHigher`, `countMatching`, `quickPicks`…), the odds (`bidChance`, `bidRisk`), the die `Face` type, the table mapper (`toTable`, `freeSeats`, `notReady` and their types) and the keeper's duties (`keeperDuty`).
  - **Test helpers** (`NO_GAME`, `NO_DICE`) are under `@bluff/game/testing`.
- **Moved with `git mv`, unchanged in behaviour,** with their tests:
  - `apps/web/src/lib/bid-rules.ts` and `bid-odds.ts`;
  - `apps/web/src/features/table/lib/table-view.ts` and `keeper-duty.ts`;
  - `table-fixture.testing.ts`, which becomes `testing.ts`;
  - the `Face` type from `dice-physics.ts`, into `face.ts`.

  `Face` keeps its name: the planned `DieFace` is already a component in `components/shared/die.tsx`.

- **The web app** imports all of these from `@bluff/game`, which is added to its dependencies and to `transpilePackages`. 47 files changed only in their imports.
- **`table-view.test.ts`** uses a plain base-unit buy-in (`25_000_000n`) instead of the web app's `ONE_CHIP`, which the package can't import.
- **Docs:**
  - `docs/architecture.md` lists the package and when code belongs there;
  - the 2026-11-11 computer player ADR pair is marked superseded;
  - its plan section points to the new plan.

## Removed

- **From `apps/web`:** `src/lib/bid-rules.ts`, `src/lib/bid-odds.ts`, `src/features/table/lib/table-view.ts`, `src/features/table/lib/keeper-duty.ts` and `src/features/table/lib/table-fixture.testing.ts`, with their tests.
- **The `Face` declaration in `dice-physics.ts`,** which now imports it from `@bluff/game`.

## Verification

- **`@bluff/game`:** typecheck, lint and all 59 moved tests pass.
- **`apps/web`:** typecheck and lint pass, and all 877 tests pass. That's the previous 936 less the 59 that moved, with none lost.
- **`pnpm knip`** is clean, and so is `pnpm preflight`, including the production build and the smoke test.
