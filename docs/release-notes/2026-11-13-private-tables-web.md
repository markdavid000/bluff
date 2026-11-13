---
date: 2026-11-13
branch: feat/private-tables-web
base: dev
scenario-impact: needs_automation
---

# Joining a private table with its invite link

Private tables work in the app again, now properly private. The host's **Copy invite link** includes the table's secret code. Someone opening that link presses **Join**: the app checks the invite (about 25 to 30 seconds, shown as "Checking your invite…"), then takes the seat. Without the code, a private table says to ask the host for the link.

## Changes

- **Invite links:**
  - **Format:** a private table's link is `/table/<number>#<code>`, with the code always written as 13 base-36 characters, padded with zeros, plus a 3-character check worked out from the code. A shortened, lengthened or edited code is caught at once, before any try is spent; a random edit slips past the check about 1 time in 46,656, and the contract still refuses it. The check reveals nothing that the full link doesn't already show. Browsers never send the part after `#` to a server.
  - **Paste box:** the lobby's paste box keeps the code when it moves you to the table.
  - **Numbers:** table numbers are read up to 15 digits, below 2^48, the same rule as the contract.
- **Proving the invite (`useProveInvite`):**
  1. It encrypts the code for `BluffInvites`, then sends `tryCode`.
  2. It reveals the true-or-false answer, retrying for up to 30 s.
  3. It sends `confirmCode`.

  The answer is read from the confirm transaction's own `Invited` event for this player and table, not from a later read that a lagging node could answer from an older block. A player who's already invited skips straight to joining. An attempt already sent before a reload is confirmed instead of spending another try.

- **Joining a private table:** the join action proves the invite first and only then takes the seat. A failed check never takes a seat.
- **Sharing the code (`useInviteCode`):**
  - The host and seated players decrypt the table's code for **Copy invite link**.
  - **No surprise signatures:** the code is only decrypted once the player's permit already covers `BluffInvites`. If it doesn't, the button reads **Show the invite link** and the player unlocks it themselves, since decrypting would otherwise ask the wallet for a signature unprompted.
  - **Stale answers:** another table's leftover answer is never shown.
  - **No code yet:** private tables made before the upgrade have none, so they share a plain link.
- **The permit** now covers `BluffInvites`. Players who signed in with Google or email get it renewed automatically. Players using their own wallet tap **Show my chips** once more.
- **Plain-language refusals:**
  - "This table is private. Ask the host for the invite link." (`NotInvited`, or a link without a code)
  - "That's too many tries for this table. Ask the host for a new link." (`TooManyTries`)
  - "That invite link doesn't work. Ask the host for a new one." (a wrong code)
- **`sendMove`** decodes `BluffInvites` errors.
- **"Play now"** breaks ties by when a table was created, since numbers no longer count up.
- **`keepTrying`** is a new shared retry helper, now used by both the keeper and the invite check.
- **Docs:** the plan's example table number was above 2^48, a number the contract can never produce; it's corrected.

## Removed

- `parseTableLink`, replaced by `parseInvite`, which also reads the code.
- The keeper's own reveal retry loop, replaced by `keepTrying`.
- "Play now"'s tie-break by table number.

## Verification

- **Vitest:** 500 passing, up from 450.
  - **`table-links`:** codes in links, the paste box and the page; numbers up to 2^48; damaged codes rejected.
  - **`useProveInvite` (7):**
    - the encrypted code, the try, the reveal and the confirm, in order;
    - an invited player skips; a reload resumes;
    - a wrong code, and an answer about another player, are both turned away;
    - the reveal retry, and a wallet that isn't ready.
  - **`useInviteCode` (9):**
    - public tables, visitors and old private tables;
    - loading;
    - never decrypting before the permit covers it, and unlocking;
    - another table's leftover answer;
    - retries for a failed read and a failed decryption.
  - **`useLinkInvite`:** reads the code and follows changes to it.
  - **`useWaitingRoom`:** the private join order (prove, then seat), no seat after a failed proof, only seated players asking for the code, and copy, unlock and loading.
  - **`TableScreen`:** the screen for each of those states.
  - **Errors, the permit (3 contracts), "Play now" and `keepTrying`.**
- **Preflight:** `pnpm preflight --fast` passed.
- **Running app:** see the pull request for the two-account walk-through.
