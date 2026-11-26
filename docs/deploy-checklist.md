# Deploy checklist: staging and production

Everything that has to be set by hand outside the repository before `staging` or `main` serves players. Each item comes from a real failure: on 2026-11-24, a missing setting crashed sign-in, and a web address that wasn't on the allowed lists left the sign-in buttons dead and the computer unreachable.

## 1. Addresses

Write these down first; the other steps use them.

| What                   | Example                                       | Where it comes from                            |
| ---------------------- | --------------------------------------------- | ---------------------------------------------- |
| Production web address | `https://bluff.vercel.app`                    | Vercel → project → Domains                     |
| Staging web address    | `https://bluff-git-staging-<team>.vercel.app` | Vercel → the `staging` branch's domain         |
| Computer service       | `https://<app>.fly.dev`                       | Fly.io app name (see CONTRIBUTING, Deployment) |
| Local development      | `http://localhost:3002`                       | the port to use locally                        |

## 2. Vercel environment variables

Set each one for **Production** and **Preview**; staging is a Preview deployment.

| Variable                      | Value                        | Notes                                                        |
| ----------------------------- | ---------------------------- | ------------------------------------------------------------ |
| `NEXT_PUBLIC_PRIVY_APP_ID`    | the Privy app ID             | not secret                                                   |
| `NEXT_PUBLIC_SEPOLIA_RPC_URL` | a browser RPC address        | not secret; limit the key to the web addresses in step 1     |
| `NEXT_PUBLIC_BOT_URL`         | the computer service address | not secret                                                   |
| `SESSION_SECRET`              | 32+ random characters        | **secret**; use a different value for Production and Preview |

The build stops if any of the four is missing, so a missing one fails the deploy rather than shipping a broken page.

## 3. Allowed origins (both lists)

Anything not listed is refused.

- **Privy** (dashboard → the app → Configuration → App settings → Domains → Allowed origins): the production address, the staging address and `http://localhost:3002`.
- **Computer service** (`ALLOWED_ORIGINS` in Fly's dashboard → the app → Secrets): the same three, comma-separated, exactly as typed in the browser (scheme, no trailing slash).

Per-commit preview links (`bluff-<hash>-….vercel.app`) aren't on either list. Sign-in and the computer only work on production, staging and localhost.

## 4. Google sign-in

- The Google OAuth consent screen is published (not "Testing"), or only listed test users can sign in.
- Privy's Google login is enabled, with the production and staging addresses allowed.

## 5. The computer service

- Deployed from the branch being served (`main` for production) with `--ha=false`. `fly status` shows **exactly one** machine, passing its check.
- `BOT_MNEMONIC` and `SEPOLIA_RPC_URL` set in Fly's dashboard.
- The bot bank (account 0) holds well over 0.05 Sepolia ETH, or the service rests and refuses new games.

## 6. Contracts

- `packages/contracts/deployments/sepolia.json` on the branch matches the live proxies. Upgrades are sent by the maintainer from the deployer key, never by an agent.

## 7. After each deploy, check by hand

1. Open the site, How to play and Why it's fair. Check the share preview with a link-preview tool. Staging's share card and links point at staging, and its `robots.txt` says `Disallow: /`.
2. Sign in with Google, with email, and with MetaMask; then sign out.
3. Claim chips; the balance counts up in green.
4. Play the computer: arrive with "The computer is joining…", play a whole game, and see the result card.
5. Quick play between two accounts on a paid table.
6. Watch a game from a third account.
7. Repeat steps 1 to 4 on an Android phone.
