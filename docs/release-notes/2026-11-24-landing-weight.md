---
date: 2026-11-24
branch: perf/landing-weight
base: dev
scenario-impact: none
---

# The landing page loads a third of the code

Builds the approved [ADR-2026-11-24-landing-weight](../adr/ADR-2026-11-24-landing-weight.md). **No contract change, no new package.**

## Changes

- **`"sideEffects": ["*.css"]` in `apps/web/package.json`.** The bundler may now drop app modules whose exports a page doesn't use. The landing page imports `DemoGame` through `@/features/table`, and it no longer drags in the rest of the table feature with the Zama SDK, Privy and wagmi.
- **A guard in the smoke test:** the production build's landing page must stay under 400 KB of first-load JavaScript, gzipped.
- **The engineering standards** say app modules never rely on being imported for side effects, and CSS is the only exception.

## First-load JavaScript, gzipped

| Page         | Before   | After    |
| ------------ | -------- | -------- |
| /            | 954 KB   | 314 KB   |
| /how-to-play | 283 KB   | 284 KB   |
| /sign-in     | 1,118 KB | 1,035 KB |

## Verification

- **The guard proved itself:** with the setting removed, the smoke test fails at 932 KB; with it, it passes at 314 KB.
- **`pnpm preflight`:** every test, both builds and both smoke tests.
- **Run-through on the production build** (which, unlike the dev server, drops the unused code), as Mark with no console errors:
  - the landing demo, How to play, Why it's fair and the lobby;
  - Play the computer, then Start;
  - Mark's dice decrypted through the Zama SDK and thrown on the 3D board;
  - a bid of 2 × six sent and landed, then the computer's turn.
