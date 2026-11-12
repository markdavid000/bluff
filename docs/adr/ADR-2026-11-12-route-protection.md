# ADR-2026-11-12: Strict route protection

- **Status:** Approved
- **Approved by:** (MarkDavid, 12th Nov 2026; filled in by the maintainer)
- **Companion:** [ADR-2026-11-12-route-protection-for-dummies.md](ADR-2026-11-12-route-protection-for-dummies.md)
- **Builds on:** [The web app](ADR-2026-11-11-web-app.md), [Onboarding with Privy](ADR-2026-11-10-onboarding-with-privy.md)
- **Supersedes:** in [Game flow and timing](ADR-2026-11-10-game-flow-and-timing.md), "Watching needs no sign-in"

## Context

The owner asked for strict route protection: a game page must not open, even briefly, for someone who isn't signed in. A sign-in check that runs only in the browser shows a flash of the page and can be skipped. The check has to run on the server, before the page renders.

What the platform gives us:

- **Next.js 16** runs `proxy.ts` (formerly middleware) on the Node runtime before every matched request. Next's authentication guide recommends it for redirects based on a session cookie, with real checks kept close to the data as well.
- **Privy**, by default, keeps the access token in the browser's local storage, so a page request carries nothing the server can check. Privy can set HttpOnly cookies itself, but only on a verified custom domain it has reviewed, never on `*.vercel.app`, and only with the production app ID. Bluff has no custom domain, and buying one has a cost.
- **Privy access tokens** are ES256 JWTs, issuer `privy.io`, audience the app ID, valid for about an hour. Anyone can verify them with the app's public verification key from the Privy dashboard; no secret is needed.
- **The chain is the real guard of the game.** Every move is checked by the contracts against the sender's address, so route protection keeps people out of screens, while the contracts keep them out of the game.

## Options considered

- **Browser-only gate.** A component redirects after Privy loads. It's simple, but the page flashes before redirecting, and it isn't strict.
- **Privy's HttpOnly cookies, checked in `proxy.ts`.** This is Privy's documented pattern. It needs a verified custom domain, and the app ID would then fail on localhost and preview deployments.
- **Bluff's own session cookie.**
  - After sign-in, the browser sends Privy's access token once to `POST /api/session`.
  - The route verifies it with Privy's public key and sets a short-lived, signed, HttpOnly `bluff-session` cookie.
  - `proxy.ts` verifies that cookie on every protected request.
  - It works on localhost, previews and `*.vercel.app` alike, with no custom domain.

## Decision

- **Protected routes:** everything in the `(game)` route group. That covers `/play`, `/welcome`, `/profile` and `/table/[id]`, including watching a table. This supersedes "Watching needs no sign-in."
- **Public routes:** `/`, `/how-to-play`, `/fairness`, `/design` (until it is deleted), `/sign-in`, `/refresh`, the metadata files, and static assets.
- **Sessions:**
  1. When Privy reports a signed-in user, the client sends its access token in the `Authorization` header to `POST /api/session`.
  2. The route handler verifies the token with `jose`: ES256, issuer `privy.io`, audience `NEXT_PUBLIC_PRIVY_APP_ID`, against Privy's published key set for the app (`https://auth.privy.io/api/v1/apps/<app id>/jwks.json`). `jose` caches the set and follows Privy's key rotation; Privy published two active keys when this was built.
  3. It then sets `bluff-session`: a JWT signed with `SESSION_SECRET` (HS256) holding the Privy user id. The cookie is `HttpOnly`, `Secure` outside localhost, `SameSite=Lax`, `Path=/`, and lasts 60 minutes.
  4. The client renews it every 45 minutes while the app is open. `DELETE /api/session` clears it on sign-out.
- **`proxy.ts`:** for a protected path, it verifies `bluff-session`.
  - **No cookie, or an invalid one:** redirect to `/sign-in?next=<path>`.
  - **Expired:** redirect to `/refresh?next=<path>`. That page asks Privy for a fresh token, renews the session and returns. If Privy has no session either, it sends the player to `/sign-in`.
  - **Exclusions:** paths with Privy's OAuth parameters (`privy_oauth_code`, `privy_oauth_state`, `privy_oauth_provider`), so Google sign-in is never interrupted, plus `/refresh` itself.
  - **Matcher:** the matcher lists the protected paths, and a test checks that every `(game)` route is matched.
- **Safe redirects:** `next` is accepted only as a same-site path, starting with a single `/`. Anything else, like `//evil.com` or a full URL, falls back to `/play`.
- **First visit:** a signed-in player without a nickname is sent to `/welcome`. This check needs a read from the chain, so it runs in the `(game)` layout on the client, after the server gate has already passed.
- **Close to the data:**
  - Route handlers that act for a player (the avatar upload in PR 9, `POST /api/session` itself) verify the session again themselves.
  - Every game action is still checked by the contracts.
- **Secrets:**
  - `SESSION_SECRET` is at least 32 random bytes, kept only in `.env.local` and Vercel's server environment, and never prefixed with `NEXT_PUBLIC_`.
- **The `bluff-session` cookie is not the wallet.** It never authorises a transaction. Transactions are signed by the player's own wallet.

## Diagram

```
 browser                                     server (Next.js)
 ───────                                     ────────────────
 Privy sign-in ─► access token (1 h) ──POST /api/session──► verify ES256 (Privy public key)
                                                             └─► Set-Cookie: bluff-session
                                                                  (HS256, HttpOnly, 60 min)
 GET /play ─────────────────────────────────► proxy.ts: verify bluff-session
                                                  ├─ valid    ─► render /play
                                                  ├─ expired  ─► /refresh?next=/play ─► Privy token ─► POST /api/session ─► back
                                                  └─ missing  ─► /sign-in?next=/play
 every 45 min while open ──POST /api/session──► renew
 sign out ──DELETE /api/session──► clear cookie, then Privy logout
```

## Consequences

- No game page renders for a visitor who isn't signed in, on any host, with no custom domain needed.
- Watching a game now needs sign-in. Judges sign in once with Google, which takes seconds.
- One new package, `jose`, pinned. It's small, has no dependencies, is maintained by an OpenID Foundation member, and is the library both Next's and Privy's docs use.
- One server environment variable to manage: `SESSION_SECRET`. Privy's public keys are fetched from its key set, so no key is copied into settings.
- One extra request at sign-in and every 45 minutes.

## Verification

- Unit tests:
  - the token check: valid, expired, wrong issuer, wrong audience, wrong algorithm, tampered;
  - the session cookie: signing, expiry and attributes;
  - the safe-redirect function: `/play`, `/table/12`, `//evil.com`, `https://evil.com`, `javascript:`, empty;
  - the `proxy.ts` decisions for every protected and public path, and the OAuth exclusion;
  - that every `(game)` route is matched.
- Manual checks:
  - **Signed out:** `curl` and a fresh browser to `/play` are redirected without rendering the page.
  - **Signed in:** the page renders with Google, email and an own wallet.
  - **Session lifecycle:** after an hour idle, the page refreshes without a sign-in, and after sign-out it's redirected again.
