---
date: 2026-11-25
branch: fix/game-correctness
base: dev
scenario-impact: none
---

# Fewer surprises at the table: no unasked wallet pop-ups, no flicker, no stuck messages

A batch of game fixes found in review. Players on their own wallet are only asked to confirm a move that keeps the table going when nobody else can, and a few marks, dice and messages no longer flicker, stick or disappear. **No contract change, no new package.**

## Changes

- **Own wallets are the table keeper's last resort** (`use-table-keeper.ts`). Players whose moves Bluff pays for (a Privy embedded wallet) keep the duty moves (`confirmSeats`, `settleReveal`, `claimTimeout`, `cancelStuckReveal`, `cancelTable`, `cancelVerification`) on the usual staggered schedule, and the computer does too.
  - A player on their own wallet waits a further 60 s (`OWN_WALLET_GRACE_MS`), and steps in only if the duty is still undone. A table of MetaMask players alone, with no computer, therefore never stalls.
  - When they do step in, a toast first says their wallet will ask them to confirm a move that keeps the table going.
  - The embedded-wallet check moved into `isSponsoredWallet` (`lib/active-wallet.ts`) and `useMovesSponsored` (`hooks/use-moves-sponsored.ts`), which `useSendMove` now uses too.
- **Ready mark stays put** (`use-waiting-room.ts`). Once a read at or after the ready move's block has been seen, the pending mark is cleared, as the bid path already does. It no longer comes back while each new block loads.
- **Moves that finish after their screen has gone** (`use-action.ts`). A failure shows a plain message with no **Try again**, and `onDone` is not called. A success only takes the working message away. A move that landed just before the screen went no longer leaves its working message on screen. `useTakeSeat` now tells `takeSeatWhileHere` whether its screen is still there. If not, the welcome gate takes the player to the seat's table (`stopHeadingTo` in `use-go-to-table.ts`).
- **"The computer is joining…" no longer waits forever** (`lib/computer-arrival.ts`). The call now records when it was answered (`answeredAt`). If the computer said yes but hasn't sat down 90 seconds later, the player sees the "can't play right now" message, and Invite and Call back return.
- **Bid controls on a slow dice read** (`use-game-board.ts`, `game-view.tsx`). On the player's turn, the controls are held back only while their dice are loading or about to be thrown, and for at most 10 seconds into the round. If the dice are locked, failed, or taking longer than that, the player can still raise or call bluff.
- **Your dice wait for the reveal card** (`game-seat.tsx`). While the reveal card is open, the player's own seat keeps showing this round's faces. It doesn't skip ahead to the next round's.
- **No "Show your chips first" while chips load** (`lib/chips.ts`). `whyUnaffordable` says `checking` for a balance that's still loading. The waiting room's Join and the results card's Play again and new-table buttons wait, disabled, instead of showing that message or an error toast. Hidden or unreadable chips still ask to be shown.
- **Reload during a reveal** (`use-game.ts`). If the table is read before the first block is known, the reveal snapshot gets its start block once one arrives, so the catch-up still runs.
- **Call the computer back after a reload** (`lib/remembered-computer.ts`). That a computer sat at a table is remembered per table for the browser session (`sessionStorage`, read and written safely). This extends the "for this visit" wording of [ADR-2026-11-25-computer-wait-notice](../adr/ADR-2026-11-25-computer-wait-notice.md) to survive a reload in the same tab.
- **Watchers don't look for play-again tables** (`use-play-again.ts`). A watcher's results card no longer polls `tableOf` and `getTable` every 6 seconds.
- **No loading flash from waiting room to game** (`use-table.ts`). The game and waiting screens start from the block-pinned read the table screen already holds (`useTable(id, { onScreen: true })`). Before, they started from an unpinned read whose cache entry could be gone.

## Removed

- The inline embedded-wallet lookup in `useSendMove`, replaced by `useMovesSponsored`.

## Verification

- **Vitest:** every item has a test that failed first for the reported reason, then passed. All web tests pass.
- **Existing tests updated to the new behaviour:** `use-computer-call.test.ts` (the call now carries `answeredAt`), `computer-arrival.test.ts` (`computerArrival` takes `now`), and the `takeSeatWhileHere` callers in `use-go-to-table.test.tsx` and `use-welcome-gate.test.ts` (new `stillHere` argument).
- **`pnpm preflight` and the running app:** left to the maintainer.
