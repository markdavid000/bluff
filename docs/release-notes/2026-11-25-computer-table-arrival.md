---
date: 2026-11-25
branch: fix/computer-table-arrival
base: dev
scenario-impact: none
---

# Arrive at a computer table with the computer already on its way

From the maintainer's screen recording of 2026-11-25. **No contract change, no new package.**

## What went wrong

With the network busy, Privy's sponsored send returned well after the new table was already on-chain:

1. The welcome gate saw the player's new seat and moved them to the table while the lobby was still waiting for Privy. The computer hadn't been asked yet, so for about 6 seconds the table showed an invite seat and **Copy invite link**, then switched to "The computer is joining…".
2. When Privy gave up altogether, the lobby said "It may still go through". The seat existed, but the computer was never asked.
3. A host leaving a table nobody else had joined closed it. The chain's `TableCancelled` showed "The table was closed" before the player's own leave finished, then "Leaving the table… the network is busy", then "You left the table".

## Changes

- **`takeSeatWhileHere`** (`hooks/use-go-to-table.ts`): while a player's own seat is being taken, the welcome gate leaves them where they are, and when the seat lands they head for its table. `useTakeSeat` uses it for every seat:
  - the lobby (create, quick play, Play the computer);
  - play again;
  - joining from the waiting room.

  So the computer is requested before the player reaches its table.

- **`useTakeSeat`:** when the wallet stops waiting (`AbortError`), it checks `tableOf` every 3 s for up to a minute. If the seat landed, and is at the table asked for when joining, it carries on as a normal seat. Otherwise the player sees the same "may still go through" message as before.
- **`useTableEvents`** takes `departing`. The waiting room sets it during the player's own leave or close, so they don't get "The table was closed" for a closing they caused. Everyone else still does.
- **`mayStillLand`** in `lib/errors.ts` names the existing `AbortError` check, so both places use the same one.

## Not changed

How long the computer takes to sit down. A computer's first game pays a one-time setup, and #83 keeps one ready ahead of time.

## Verification

- **Vitest:** red first (the gate test, the hold, the take-seat recovery and the closed notice), green after. All web tests pass.
- **`pnpm preflight`.**
- **Live:** see the pull request.
