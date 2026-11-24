# ADR-2026-11-24: Let the bundler drop unused app code

- **Status:** Accepted
- **Approved by:** the maintainer, 2026-11-24
- **Companion:** [ADR-2026-11-24-landing-weight-for-dummies.md](ADR-2026-11-24-landing-weight-for-dummies.md)

## Context

The PR 7 audit measured the JavaScript each public page downloads on first load, gzipped, from a production build:

| Page           | First-load JS |
| -------------- | ------------- |
| `/` (landing)  | 954 KB        |
| `/how-to-play` | 283 KB        |
| `/sign-in`     | 1,118 KB      |

The landing page should cost about the same as How to play. The [engineering standards](../engineering-standards.md#performance) say "the game providers and the Zama SDK load only on routes that play. The landing page does not pay for them."

**The cause.** Since #69, `app/page.tsx` renders `DemoGame`, imported, as the [architecture](../architecture.md) requires, through `@/features/table`. That `index.ts` also exports `TableScreen`, `HistoryScreen` and the rest of the real game, which reach the Zama SDK, Privy and wagmi. The bundler can't tell whether those other modules do something when merely imported, so it keeps them all. The landing page downloads:

- the Zama SDK and relayer client (181 KB);
- Privy and its wallet connectors (about 200 KB);
- wagmi and viem;

and none of it is ever used there.

## Options considered

### Option A: declare the app's modules free of side effects

Add `"sideEffects": ["*.css"]` to `apps/web/package.json`. This tells the bundler that importing any app module does nothing on its own apart from CSS, so modules whose exports are unused can be dropped. It's the standard switch, which webpack and Turbopack both honour.

- **Measured in a production build:** `/` falls from 954 KB to 323 KB, `/sign-in` from 1,118 KB to 1,035 KB, and `/how-to-play` stays at 284 KB.
- **The risk:** a module that the app relies on being imported only for its side effects would be dropped silently. The audit found exactly one such import, `import "./globals.css"` in the root layout, and the `*.css` pattern keeps it. No app module assigns globals or registers anything at module level.
- **Scope:** one line, plus a guard (see Decision). It applies to every route, so every route benefits.

### Option B: a second public entry for the table feature

Export `DemoGame` from `features/table/demo.ts`, so the landing page imports only it.

- It fixes only the landing page.
- It breaks the rule that features are imported only through `index.ts`, so it needs a lint and architecture change, and it invites more exceptions.

### Option C: load the demo after the page

Wrap `DemoGame` in `next/dynamic` from a small client component.

- The first load drops, but the same 630 KB of unused code still downloads straight afterwards, which is no better on mobile data.

### Option D: leave it

- Players and judges opening the front page on a phone download nearly 1 MB of code they never run.

## Decision

**Option A.**

1. Add `"sideEffects": ["*.css"]` to `apps/web/package.json`.
2. **Guard it in the smoke test:** the production build's landing page must stay under **400 KB** of first-load JavaScript, gzipped, so a later import can't quietly pull the game code back in. The script sums the page's own `/_next/static/*.js` scripts and fails above the limit.
3. Record the rule in the engineering standards' Performance section: app modules must not rely on being imported for side effects, and CSS is the only exception.

## Diagram

```
 today                                     with "sideEffects": ["*.css"]
 app/page.tsx                              app/page.tsx
   └─ @/features/table (index.ts)            └─ @/features/table (index.ts)
        ├─ DemoGame ✓ used                        ├─ DemoGame ✓ used ─► shipped
        ├─ TableScreen ─► Zama, Privy, wagmi       ├─ TableScreen    ─► dropped
        └─ HistoryScreen ─► …                      └─ HistoryScreen  ─► dropped
   954 KB on first load                       323 KB on first load
```

## Consequences

- **Better:**
  - the front page loads about a third of the code, which matters most on phones and on judges' first look;
  - `/sign-in` sheds 83 KB.
- **The new constraint:** a module that must run when imported needs listing in `sideEffects`. Today there is none apart from CSS.
- **The guard** makes a regression fail CI rather than go unnoticed.
- **No packages** are added or removed, and the contracts are untouched.

## Verification

- `pnpm preflight`: all web tests, the production build, and the smoke test with the new 400 KB guard (the landing page measures 323 KB).
- **A full run-through in the running app**, since this touches every route:
  - sign in with Google;
  - the lobby;
  - Quick play;
  - Play the computer through a whole game;
  - watching;
  - the history page;
  - How to play and Why it's fair;
  - the landing demo.
- Then the same first-load measurement as above, recorded in the PR.
