---
date: 2026-11-26
branch: fix/lagging-nodes
base: dev
scenario-impact: none
---

# Start that works first time, and a rounds panel in order

From the maintainer's game against the computer on 2026-11-26. **No contract change, no new package.**

## What went wrong

- **Start the game failed three times with "Something went wrong".**
  - The browser log showed `PrivyApiError: Execution reverted for an unknown reason` each time, while the app's own check of the move had passed.
  - The computer had only just pressed Ready. The node Privy uses to run sponsored moves hadn't caught up, so to it the computer wasn't ready yet.
  - A later try worked once it caught up.
- **The rounds panel misbehaved.**
  - The log showed React warnings: "two children with the same key, `2`/`3`".
  - The panel showed a stale round on top (Round 3 above Round 5), with the current bid filed under it.
  - The cause: the game reads the table through a fallback of two RPC providers, so the newest block number can come from one node while the read at that block goes to another that hasn't caught up. That read failed, and the table hook kept showing the previous table. The history, read separately, had moved on, and `withCurrentBid` added the stale round again.

## Changes

- **`useSendMove`:**
  - When Privy refuses a sponsored move without a reason, the app checks the move again, waits 4 s and resends, up to 3 tries.
  - If the check now finds a real rule broken (for example someone not ready), it stops with that reason.
  - If every try is refused, the player reads "The network is busy. Please try again in a moment." instead of "Something went wrong".
- **`useTable`:** if a read pinned to the newest block fails because a node is behind (anything but "table not found"), it reads the latest table instead of holding the old one.
- **`withCurrentBid`:** the shown bid is never filed under a round older than the newest round in the history, so a round is never shown twice.
- **`refusedWithoutReason`** in `lib/errors.ts` is shared by the send path and the error message.

## Verification

- **Vitest:** red first for each fix (the retry, giving up, the real reason, the busy message, the stuck read, the stale round); all web tests pass.
- **`pnpm preflight`.**
- **Live:** start a game against the computer straight after it sits down, and watch the rounds panel through several rounds.
