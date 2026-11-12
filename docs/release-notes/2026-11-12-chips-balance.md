---
date: 2026-11-12
branch: feat/chips-balance
base: dev
scenario-impact: needs_automation
---

# Chips: see your balance, claim free chips every day, and cash out

Players now see their chip count in the header and on a chips card in the lobby. The count is private to them and counts up or down when it changes. Once a day they can tap **Get 100 free chips**; otherwise a ticking badge shows when the next ones arrive. **Cash out** turns chips into public practice dollars in one action, and an interrupted cash out can be finished later.

## Changes

- **Zama SDK in the app.** `ZamaProvider` wraps the game screens. It is configured with Privy's wagmi config, the Sepolia relayer (no key needed) and single-threaded mode.
- **Reading permit (`usePermit`).** One permit covers the chip token and `Bluff`.
  - Google and email players sign it silently on their first visit.
  - Own-wallet players tap **Show my chips**, with a note that the signature is free and sends nothing.
  - The permit check is refreshed, never deleted, so every part of the screen updates together.
- **Only the signed-in wallet signs or sends.**
  - `WagmiProvider` gets `setActiveWalletForWagmi` (`lib/active-wallet.ts`). Before this, a Google player with MetaMask installed was asked by MetaMask to sign, and their chips never unlocked.
  - `usePermit` refuses to sign while wagmi's wallet is not the player's.
  - Own-wallet moves name the player's account.
- **Wrong network.** An own wallet on another network is switched to the game's network (`useEnsureGameChain`) before it signs or sends. A refused switch shows "Cancelled".
- **Header balance** (`ChipBalance`): a cowrie and the chip count, with loading, hidden and try-again states.
- **Chips card on `/play`** (`ChipsPanel`):
  - the balance, counting up or down;
  - **Get 100 free chips**, or a raised yellow countdown badge (`CountdownBadge`) ticking `HH:MM:SS` with a pulse each second;
  - **Cash out**;
  - once anything is cashed out, the practice dollars (also counting), a note that they are public, and **See your cash outs on the public record**, which opens the explorer page of the player's dollar transfers.
- **Cash out dialog:**
  - type an amount, checked against the balance, or **Cash out everything**;
  - both steps (burn, then finish with the public reveal) run as one action through `useSendMove`, so they are sponsored for Google and email players;
  - the reveal is retried every 3 seconds for up to 30 seconds.
- **Resume.**
  - The cash-out request is saved in the browser when the first step lands, and recent events cover other devices.
  - The card offers "Your last cash out did not finish. Finish it now".
  - **Try again** after a failed second step finishes that cash out and never burns twice.
- **Counting numbers** (`useCountingAmount`, `CountingAmount`): amounts count over 0.9 s, green going up and red going down. They jump instead when reduced motion is on. Screen readers hear only the final amount.
- **Cowrie icon** (`Cowrie`): drawn in the app with day and night tokens (`--cowrie`, `--cowrie-shade`, `--cowrie-slit`), since no free cowrie asset exists. It replaces the coin on every chip button and display.
- **Errors:** a declined signature is "Cancelled", and a busy decryption service is "The network is busy".
- **`lib/chips.ts`:** chip amounts as `bigint` base units (6 decimals), shown with grouping and parsed strictly.
- **Dependency:** `wasm-feature-detect` is pinned to 1.9.0 through a workspace override. 1.10.0 (published 2026-11-09) added an `import.source("data:…")` probe that panics Turbopack's build.
- **Docs:** the web app ADR pair and the plan record the deviations: own cash-out steps instead of `useUnshield`, permit handling, active wallet, single thread.

## Removed

- Nothing from earlier pull requests. Within this branch, the early `ssr: false` boundary around the Zama provider was dropped once the build panic was fixed at its cause.

## Verification

- **Tests:** 32 files, 207 web tests. New ones:
  - `lib/chips`, `lib/time`, `lib/active-wallet`;
  - `use-permit`: silent once for embedded wallets, a tap for own wallets, every component updates, network switch, never a different wallet;
  - `use-send-move`: network switch, signed-in account only, sponsored path;
  - `use-counting-amount`;
  - `use-cash-out`: exact sealed amount, everything, retry finishes instead of burning again (confirmed red without the guard), resume, reveal retry, 30-second give-up;
  - `use-pending-cash-out`;
  - `use-claim-chips`;
  - the `pending-cash-outs` store;
  - the `ChipsPanel`, `ChipBalance`, `CashOutDialog` and `Cowrie` components.
- **The chain:** the live chip token (`cUSDTMock`) was checked for `unwrap` (both forms), `finalizeUnwrap`, `unwrapAmount` and `unwrapRequester`. Finished requests read back as the zero address.
- **Used in the running app by the maintainer:**
  - signed in with Google in Chrome and Brave;
  - signed in with an own wallet in Chrome;
  - the balance in the header and the card, the permit, the countdown badge, a cash out with the count-down, the practice dollars and the cowrie.
  - **Get 100 free chips** itself was not pressed, because the daily limit had not passed. Its hook test covers the claim and the balance refresh.
  - The automated browser could not reach the local server, so these checks were done by hand.
