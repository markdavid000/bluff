# ADR-2026-11-18: Basic security headers

- **Status:** Approved
- **Approved by:** the maintainer, 2026-11-18, in chat (basic headers only; the strict CSP is deferred)
- **Companion:** [ADR-2026-11-18-security-headers-for-dummies.md](ADR-2026-11-18-security-headers-for-dummies.md)

## Context

The web app sends no security headers: `next.config.ts` has no `headers()`. So:

- any site can frame Bluff (clickjacking);
- browsers may guess content types;
- full URLs leak in referrers;
- the page may ask for device features it never uses.

The repository is now public. The game runs on Sepolia with practice chips and isn't deployed yet (Vercel is paused until about 2026-11-28), so the real risk today is low. The deadline is 2026-12-14.

## Options considered

### A. Basic headers from `next.config.ts` (chosen)

The same headers on every response:

| Header                      | Value                                                          | Why                                                                                           |
| --------------------------- | -------------------------------------------------------------- | --------------------------------------------------------------------------------------------- |
| `Strict-Transport-Security` | `max-age=63072000; includeSubDomains`                          | Always HTTPS once seen. Browsers ignore it on `http://localhost`.                             |
| `X-Content-Type-Options`    | `nosniff`                                                      | No content-type guessing.                                                                     |
| `Referrer-Policy`           | `strict-origin-when-cross-origin`                              | Other sites see only the origin, not paths like `/table/12`.                                  |
| `Permissions-Policy`        | `camera=(), microphone=(), geolocation=(), browsing-topics=()` | Features Bluff never uses. Picture uploads (PR 9) use a file picker, not the camera.          |
| `X-Frame-Options`           | `DENY`                                                         | No framing, for older browsers.                                                               |
| `Content-Security-Policy`   | `frame-ancestors 'none'`                                       | No framing. This sets only the framing rule, so no script, style or connection is restricted. |

- **Cost:** a few lines of config.
- **Speed:** no runtime or rendering change; pages stay statically rendered.
- **Risk:** practically none. Bluff frames Privy's pages, but nothing frames Bluff.

### B. A, plus a strict nonce-based CSP

Blocks injected scripts and limits outside connections. It makes every page render on request, and needs a careful report-only run through every flow (Google, MetaMask, encryption, paid join, game, cash out). Any missed origin quietly breaks a feature. **Deferred:** it can be revisited after deployment, if time allows before the deadline.

### C. Nothing

Leaves framing and sniffing open for no saving. Rejected.

## Decision

Option A. The header list lives in `src/config/security-headers.ts`, and `next.config.ts` serves it from `headers()` for every path.

## Diagram

```
any request ─► Next.js ─► response + 6 headers (from next.config.ts headers())
                             no change to rendering, scripts or connections
```

## Consequences

- **Better:** Bluff can't be framed, content types aren't guessed, referrers carry only the origin, and unused device features are refused.
- **Unchanged:** speed, rendering, sign-in, wallets, encryption and gameplay.
- **Not covered:** injected scripts (option B, deferred).
- **Packages:** none.

## Verification

- **Vitest, test first:** `next.config.ts` serves every header above for all paths.
- **Smoke test:** `scripts/smoke.sh` checks the headers on the production server.
- **Live:** sign-in, the lobby, a game and the chips panel still work, with no console errors.
