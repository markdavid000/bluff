# ADR-2026-11-17: Seated players always land on their table

- **Status:** Approved
- **Approved by:** the maintainer, 2026-11-17, in chat
- **Companion:** [ADR-2026-11-17-back-to-your-game-for-dummies.md](ADR-2026-11-17-back-to-your-game-for-dummies.md)

## Context

A player can hold one seat at a time (`Bluff.tableOf`). Today only the lobby notices it: a seated player sees a **Back to your table** card instead of the lobby options. On every other game page, such as **Your games** (`/history`) or another table's link, the app says nothing. A player who wanders off mid-game can miss turns and lose dice to the 60-second clock.

The maintainer chose on 2026-11-17: while you're seated, loading **any** other page in the app takes you straight to your table.

What exists today:

- `useMyTableId()` (`src/hooks`) reads `tableOf(me)` every 6 s.
- `WelcomeGate` (`features/account`) wraps every page in the `(game)` route group: `/play`, `/history`, `/welcome` and `/table/[id]`. It shows "Getting your seat ready…" until the player is known, and already redirects (to `/welcome`, or onward).
- **On leaving:** `markLeftTable` (`features/table/hooks/use-table.ts`) remembers tables left in this session, and `useForgetMyTable` clears the cached seat. Both exist because a lagging node can still report the old seat for a few seconds.

## Options considered

### A. Redirect in the existing gate, holding the page until the seat is known (chosen)

`useWelcomeGate` also reads `useMyTableId()`. Once the player is known and has a name:

- **Seated at X, and the page isn't `/table/X`:** `router.replace("/table/X")`, keeping the gate's loading view, so the other page never draws.
- **Not seated, or already on `/table/X`:** show the page.
- **The seat read fails:** show the page, because one failed read shouldn't lock the player out of the app. The read keeps retrying every 6 s and redirects as soon as it finds a seat.
- **A table you left in this session:** never redirect to it, even if a lagging node still reports the seat. The left-table memory moves from `features/table` to `src/hooks/use-left-tables.ts`, so both the table feature and the gate can use it without a cross-feature import.

Cost: one more read before a game page shows. It runs alongside the profile read the gate already waits for, so it adds about 0.1–0.3 s at most.

### B. Redirect in the server proxy

The proxy has no wallet address on the server and would need a chain read on every request. Slower and more fragile. Rejected.

### C. Redirect only from the lobby

Already almost what the lobby card does. It doesn't cover `/history` or other tables' links, which the maintainer asked for. Rejected.

## Decision

Option A.

- **The rule:** a seated player loading `/play`, `/history`, `/welcome` or another `/table/[id]` is sent to their own table.
- **The lobby card goes:** the lobby's **Back to your table** card can no longer be reached, so it's removed (Directive 6), along with its copy, its lobby branch and its tests.
- **Out of scope:** the public home page (`/`) and the sign-in pages sit outside the game pages and are unchanged.

## Diagram

```
any (game) page load
        │
        ▼
WelcomeGate: player known? ── no ──► "Getting your seat ready…"
        │ yes, has a name
        ▼
useMyTableId: tableOf(me)
   ├─ loading ──────────────► "Getting your seat ready…"
   ├─ failed ───────────────► show the page (retry every 6 s)
   ├─ none, or a table left
   │   this session ────────► show the page
   └─ table X
        ├─ already on /table/X ► show the page
        └─ elsewhere ──────────► router.replace("/table/X"), keep loading view
```

## Consequences

- **Better:** a seated player can't drift away from a live game. Reloads, bookmarks, the lobby and **Your games** all land on the table.
- **Costs:**
  - **Your games** and other tables' links are unreachable while seated, by the maintainer's choice;
  - opening the profile's **Your games** link while seated sends you back to your table;
  - each game page waits for the seat read, alongside the profile read.
- **Removed:** `BackToTableCard`, `lobbyCopy.backToTable` and its related copy, the lobby's `seatedAt` branch, and their tests. The left-table memory moves from `use-table.ts` to `src/hooks/use-left-tables.ts`.
- **Packages:** none.

## Verification

- **Vitest, test first:**
  - the gate sends a seated player from `/play`, `/history` and `/table/OTHER` to `/table/X` and never shows that page;
  - it shows the page when not seated, when already on `/table/X`, and when the seat read fails;
  - it never sends a player back to a table they left this session, even while the read still reports it;
  - it waits while the seat is loading.
- **Lobby tests:** updated for the removed card.
- **Live, with two accounts:**
  - while seated, load `/play`, `/history` and another table's link, and each lands on the table with no flash of the other page;
  - press Leave and stay in the lobby with no bounce back;
  - finish a game and reach the lobby normally.
