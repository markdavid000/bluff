---
date: 2026-11-12
branch: feat/sign-in
base: dev
scenario-impact: needs_automation
---

# Sign in, and game pages that only open for signed-in players

Players sign in with Google, email or their own wallet, and see their name and tag in the header. Every game page is checked on the server before it renders: anyone not signed in is sent to sign in, then taken back to where they were going.

## Changes

- `@bluff/contracts` now exports typed ABIs and the Sepolia addresses. `pnpm compile` writes `exports/abis.ts`, which is git-ignored like the other generated code, and CI's build job compiles the contracts first.
- **Route protection** ([ADR-2026-11-12-route-protection](../adr/ADR-2026-11-12-route-protection.md)):
  - `src/proxy.ts` guards `/play`, `/welcome`, `/profile` and `/table/*`. A missing or forged session goes to `/sign-in?next=…`, and an expired one to `/refresh?next=…`. Privy's OAuth return is never interrupted.
  - `POST /api/session` verifies Privy's ES256 access token against Privy's published key set (`jose`, which follows key rotation), then sets `bluff-session`: an HS256 JWT signed with `SESSION_SECRET`, HttpOnly, Lax, 60 minutes. `DELETE` clears it.
  - `next` is only ever a path on this site, never another site or a script link.
- **Sign in** (`features/account`):
  - Three raised buttons: Google (straight to Google, through Privy's `initOAuth`), email, and own wallet.
  - The session renews every 45 minutes while the app is open.
  - `/refresh` renews an expired session without asking the player again.
  - Sign-out clears the session, then signs out of Privy.
- The header shows the player's nickname from `ChipFaucet`, or "Player", plus the `#ABCD` tag from their address.
- **The sign-in page** is a full scene:
  - on laptops, the Bluff welcome (title, tumbling die and three tilting cards) sits beside the sign-in card;
  - on phones, the welcome is on top;
  - a soft adire pattern and warm light fill the background.
- **Every screen** has the same three controls, `ScreenControls`: day or night, sounds, and music.
  - Night follows the device until the player chooses.
  - A small script in the page head sets it before the first paint, so there is no flash.
  - The table music plays across the app, starting on the first tap. The music tile opens a menu: drum rhythm, bell rhythm, or drum and bell, plus music on or off. The choice is remembered, and any saved value Bluff doesn't recognise falls back to the default.
- **Every `ActionButton`** slides between its label and its working words, with a spinning die. It fades instead when the player prefers less motion.
- `scripts/check-comments.mjs` and `scripts/check-copy.mjs` skip files deleted but not yet committed. They used to crash on them.
- `notify` renders every toast as a wooden `ToastTile` through Sonner: success 3 s, info 4 s, errors until dismissed, at most three.
- Network reads go through a viem `fallback`: the Alchemy key first, then the public Sepolia endpoint.
- Server tests run in a Node Vitest project (`*.server.test.ts`); component and browser tests stay in jsdom.
- The smoke test now checks a production build: open pages return 200, and every game page redirects to sign-in, with no cookie and with a forged one.
- `@tanstack/eslint-plugin-query` rules are on.
- Packages:
  - `@privy-io/react-auth`, `@privy-io/wagmi`, `wagmi`, `viem`, `@tanstack/react-query`, `sonner` and `jose`.
  - `@solana/kit` 8.6.0, needed only because Privy's optional Solana modules break the production build without it, as the Privy spike found.
  - `@tanstack/eslint-plugin-query` (dev).
  - `lucide-react`, for the tick marks in the shadcn dropdown menu.
  - All pinned.
- `pnpm-workspace.yaml` denies the install scripts of `@reown/appkit`, `bufferutil` and `utf-8-validate`, which Bluff doesn't need.
- The game flow ADR: watching a table now needs sign-in.

## Removed

- "Watching needs no sign-in", superseded by the route protection ADR.

## Verification

- 81 web tests:
  - the theme: device, saved choice, and the before-paint script;
  - the action button: ready, working, back again, and its sound;
  - session tokens: valid, expired, wrong secret, tampered, wrong issuer, no player;
  - Privy tokens: wrong issuer, wrong app, expired, wrong key, a shared-secret forgery;
  - safe redirects;
  - every guard decision;
  - every `(game)` page sitting inside the proxy matcher.
- `pnpm preflight`: all 10 gates pass, including the guarded smoke test.
- Dev server: `/play` redirects to `/sign-in?next=%2Fplay`, a fake token gets 401, and sign-out clears the cookie.
- Signed in with Google, email and an own wallet in the running app: see the pull request.
