---
date: 2026-11-26
branch: perf/fewer-rpc-calls
base: dev
scenario-impact: none
---

# Fewer calls to the blockchain node

The maintainer saw a lot of RPC traffic in the browser's network tab and worried about exhausting the node. These are the four low-risk cuts they approved from the RPC audit. Moves show up just as fast as before.

1. **No more stacked retries** (`config/chain.ts`): each node in the game's fallback is now tried once per round, and the fallback adds one extra round.
   - **Before:** each node's own `retryCount: 2` (3 tries) ran inside viem's default 3 fallback retries (4 rounds). One failing read made up to 24 requests, before React Query's own retries.
   - **Now:** at most 2 tries per node, 4 requests. Failing over between your node and publicnode still works, and React Query still retries.
2. **"Which table am I at?" checked less** (`hooks/use-my-table-id.ts`): every 30 s instead of every 6 s, and not on a timer at all on a table page, which already shows the seat.
   - Joining, sitting down and play-again already refresh it themselves, and leaving clears it at once.
   - Only being seated from another device takes longer to notice: up to 30 s instead of 6.
3. **Reveal catch-up** (`use-round-result-catch-up.ts`): checks every 5 s instead of 2 s, while a round's result hasn't arrived through the live event.
4. **History page:**
   - each game's ending is looked for from the block you joined it, not from the contract's first block;
   - endings already found are remembered for the visit, and later scans only cover new blocks;
   - results are the same, and the latest ending still wins for a table that was played again.

**No contract change, no new package.**

## Estimated requests per minute

| Screen       | Before | After |
| ------------ | ------ | ----- |
| Lobby (idle) | ~23    | ~15   |
| Waiting room | ~45    | ~35   |
| Game         | ~65    | ~55   |

During a reveal, the game drops by up to ~18 more per minute, and a failing node no longer multiplies requests. These figures are estimates from reading the code, not live measurements.

## Verification

- **Vitest:** red first for each change:
  - the request count per node when a read keeps failing (12 → 2);
  - 30 s away from a table, and no timer on a table page;
  - a 5 s catch-up;
  - endings searched from the join block, and not searched again after "load more".
- Full suite and `pnpm preflight` pass.
