# Plan: seated players always land on their table

Builds [ADR-2026-11-17-back-to-your-game](../adr/ADR-2026-11-17-back-to-your-game.md) once both ADR files are approved.

## Files

- **New `apps/web/src/hooks/use-left-tables.ts`:** the left-table memory moved out of `features/table/hooks/use-table.ts`, as `markLeftTable` and `useLeftTable(id)`, with its tests. `use-table.ts`, `use-waiting-room.ts` and `use-game.ts` import it from there.
- **`features/account/hooks/use-welcome-gate.ts`:** reads `useMyTableId()`, works out where a seated player belongs, `router.replace`s there, and keeps `view` on `"waiting"` until the page is right. It's tested first in `use-welcome-gate.test.ts`.
- **`features/lobby`:** remove `back-to-table-card.tsx`, the `seatedAt` branch in `lobby.tsx`, `lobbyCopy.backToTable` and its related copy, and the lobby tests for the card.
- **Docs:** the release note, and `docs/architecture.md` if it describes the lobby card.

## Order

1. Write the gate tests and see them fail.
2. Move the left-table memory, with no change in behaviour.
3. Add the gate rule, then remove the lobby card.
4. Run `pnpm preflight`, `pnpm knip` and the live check with Favour and Mark.
5. Open the PR.

## Removed

`BackToTableCard`, its copy, the lobby's `seatedAt` branch, and their tests.
