---
date: 2026-11-18
branch: feat/security-headers
base: dev
scenario-impact: none
---

# Basic security headers on every page

Every response now carries six standard security headers, from `next.config.ts`. This builds the approved [ADR-2026-11-18-security-headers](../adr/ADR-2026-11-18-security-headers.md). The stricter script-blocking policy was considered and deferred.

## Changes

- **`src/config/security-headers.ts`:**
  - `Strict-Transport-Security`;
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy` (no camera, microphone, geolocation or browsing topics);
  - `X-Frame-Options: DENY`;
  - `Content-Security-Policy: frame-ancestors 'none'`, which sets only framing and restricts no scripts or connections.
- **`next.config.ts`:** `headers()` serves them for every path. Rendering is unchanged, so pages stay static.
- **`scripts/smoke.sh`:** checks the headers on the production server.

## Removed

Nothing.

## Verification

- **Vitest, red then green:** the config serves every header on every path.
- **`pnpm preflight`:** the smoke test checks the headers on `next start`.
- **Live (dev server, as Favour):**
  - all six headers arrive;
  - the lobby and the chips panel (decrypted balance, 400) work;
  - Your games lists 12 games;
  - no console errors.
