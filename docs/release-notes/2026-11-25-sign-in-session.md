---
date: 2026-11-25
branch: fix/sign-in-session
base: dev
scenario-impact: none
---

# Sign in, sign out and staying signed in, fixed

A returning player whose first try at getting in failed can now press a button and get in, instead of watching "Signing you in…" forever. A session that runs out after an hour now renews quietly instead of sending the player back to sign in. Sign out lands on the home page cleanly, and own wallet players are told what to do when their wallet has no coins for moves or is locked. **No contract change, no new package.**

## What went wrong

1. **Stuck on "Signing you in…".** A player already signed in with Privy whose automatic entry failed once (a session error, a name read failing) got the error and the buttons back. Pressing one called Privy's `login()` or `initOAuth()`, which do nothing for someone already signed in, and the entry effect never ran again. The screen stayed busy with every button disabled.
2. **No quiet refresh.** The `bluff-session` cookie lived exactly as long as its token (one hour), so the browser deleted it as the token expired. The guard saw no cookie, called it invalid, and sent everyone to `/sign-in` instead of `/refresh`.
3. **Generic wallet errors.** An own wallet with no Sepolia ETH, or a locked, disconnected or switched MetaMask, showed "Something went wrong".
4. **Sign out.** A failed sign out said "We could not sign you in". A good one toasted "You are signed out" on the landing page, which has no toaster, while the welcome gate raced it to `/sign-in` and `DELETE /api/session` went out up to four times (sign out, session keeper, and the gate on each render).
5. **`/profile`** was guarded by the proxy matcher, the route guard and the smoke test, but no such page exists.
6. **Guard bypass.** Any guarded page with a Privy OAuth parameter (`?privy_oauth_state=x`) opened without a session.

## Changes

- **`useSignIn`:** when Privy is already signed in, a button press retries entry (a retry counter in the entry effect's dependencies) instead of calling Privy's login.
- **`sessionCookieOptions`:** the cookie lasts a day (`SESSION_COOKIE_SECONDS`), longer than the one hour token, so an expired token reaches the guard and goes to `/refresh`. The token itself still lasts an hour.
- **`explainProblem`:** viem's `InsufficientFundsError` anywhere in the cause chain maps to `errorCopy.walletNeedsCoins`. wagmi's `ConnectorNotConnectedError`, `ConnectorNotFoundError`, `ConnectorAccountNotFoundError` and `ConnectorUnavailableReconnectingError` (by name), and viem's `UnauthorizedProviderError` and `ProviderDisconnectedError` in the cause chain, map to `errorCopy.walletNotConnected`.
- **Sign out:** `useSignOut` marks a deliberate sign out (`hooks/use-signing-out.ts`), closes the session, logs out of Privy and leaves with a full page load to `/`. While it is marked, the welcome gate neither closes the session nor redirects, and the session keeper does not close it again, so `DELETE /api/session` is sent once. A failure clears the mark and shows `accountCopy.signOutProblem`. An unexpected sign out (session lost) behaves as before.
- **Route guard:** Privy's OAuth parameters are honoured only on the sign-in pages, where Google returns (`initOAuth` redirects back to the page it was called from, `/sign-in`). A guarded page carrying them without a session is redirected like any other.

## Removed

- `/profile` from `proxy.ts`'s matcher, `PROTECTED_PREFIXES` in `lib/route-guard.ts`, `scripts/smoke.sh` and the tests that listed it.
- The "You are signed out" toast and its `accountCopy.signedOut` line, which could never be seen.

## Not changed

- The route protection ADR still says the cookie lasts 60 minutes. The token does; the cookie now outlives it so the ADR's `/refresh` path works as described.

## Verification

- **Vitest, red first then green:**
  - `use-sign-in.test.ts`: a returning player can try again with Google, email or wallet after entry failed once.
  - `session-token.server.test.ts`: the cookie outlives its token.
  - `errors.test.ts`: no coins for moves, a disconnected or switched wallet, a locked wallet.
  - `use-sign-out.test.ts` (new): the session is closed once and the player lands on `/` with a full page load; a failed sign out says so; an unexpected sign out still goes to `/sign-in`.
  - `route-guard.server.test.ts`: `/play?privy_oauth_state=x` without a session is redirected; Google sign-in is never interrupted on `/sign-in`.
  - `proxy.server.test.ts`: the matcher guards only pages that exist in the `(game)` group.
- **`pnpm preflight`** and a live check: see the pull request.
