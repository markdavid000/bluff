---
date: 2026-11-13
branch: feat/game-screen
base: dev
scenario-impact: needs_automation
---

# Play a full game of Bluff on the board

A started table now opens the game itself:

- **Your dice:** they're shaken and thrown, and only you can see them.
- **Bidding:** pick from every legal bid, or call the bluff on whoever bid last.
- **Calling:** everyone's dice are laid out on their side, with the dice that count glowing, and the result shows for 5 seconds.
- **Timing:** turns and timeouts keep the game moving on their own, and the results show the winner and the chips won.

This is PR 5A of the [game screen plan](../plans/2026-11-13-game-screen-plan.md).

## Changes

The screen follows the maintainer's playtest and three reference recordings: everything fits on one screen with no scrolling, and there's very little text.

- **The game view (`GameView`):**
  - **Top strip:** the round, the dice in play, the current bid as a raised yellow badge in the middle ("Bid 3 × ⚃", with who made it), which pops each time the bid changes, the game clock, the pot (paid tables) and Leave.
  - **The middle:** the 3D board, sized as the largest square that fits, with players around it.
  - **The bottom:** the bid control on your turn; otherwise one short line, such as "Ada is thinking…". While dice are revealed the line stays empty and a "Revealing dice…" toast shows instead, staying until the reveal is done.
- **The seats (`GameSeat`):**
  - **Opponents:** face-down tiles, one per die.
  - **You:** real faces, with the ones that count for the bid you're choosing lifted and ringed. **Show my dice** unlocks them for players using their own wallet.
  - **Bids:** each player's last bid this round sits as a chip beside their face.
- **The turn timer (`TurnRing`):** a ring around the thinking player's face drains over the 30 seconds, from green through yellow to red, with no numbers. The last ten seconds are announced to screen readers.
- **The bid control (`BidControl`):**
  - **Choosing:** a quantity stepper and the faces 2 to 6. It starts on the lowest legal bid (your strongest face for the first bid). Picking a face keeps the quantity where it can, and raises it only when it must.
  - **Coaching tips (`useCoachTips`):** on your turn only, a toast says how your chosen bid looks ("4 × four looks risky"), worked out from your own dice and the hidden dice. When it's risky, the toast offers a safer bid you can take in one tap. The tip stays 10 seconds (longer than a passing notice) and leaves when your turn ends.
  - **Buttons:** **Raise** and **Call bluff on Ada** sit side by side. At the top bid, only the call remains.
- **The reveal:**
  - **On the board:** cups lift, each player's dice lie face up on their side, and the counting ones glow.
  - **The card (`RevealCard`):** a stamp ("Bluff caught!" or "The bid holds"), the count and who loses a die, then each player's dice with their match count and Bid or Called tags.
  - **Closing it:** **Continue**, or it closes by itself after 6 seconds.
- **The results (`ResultsCard`):**
  - the winner, or everyone sharing a win;
  - "You won 20 chips" on a paid table, split exactly as the cashier pays it;
  - every player's dice left at the end.

  The winners come straight from the table's `GameEnded` event as the game ends. After a reload, they're read from recent history (the last 9,000 blocks), once the history server has caught up to the newest block the app has seen; it can lag behind the game's own server. Only then does a missing event mean the game is too old, and the card says so rather than guessing.

- **The keeper's new jobs:** it settles a called round at once, claims a turn that ran out of time, and cancels a reveal stuck for 10 minutes. Players still in go first, in seat order, 8 seconds apart, re-reading before they send. Losing the race to another player counts as done. Every deadline gets 15 extra seconds, because the chain's clock runs behind the browser's, and acting on time exactly made the claim fail.
- **Working toasts (`useWorkingNotice`):** "Revealing dice…" and "Checking everyone paid…" follow the table itself: they stay up for as long as the table is revealing or checking, and leave the moment it isn't. They used to be passing toasts from events that left after 4 seconds.
- **The end of a game:** the last reveal card shows first, and the results open only once it closes (or after 3 seconds if the last reveal never arrives). A game that was already over opens straight on the results. If you won, the card says "You win!" rather than your own name, and you show as "You" in a shared win.
- **Steadiness (no flicker):**
  - **Your bid:** a bid you placed is dropped for good once the table confirms it. Before, every new block briefly brought it back, flashing an old bid over "No bid yet" and switching your turn off and on.
  - **Your dice and everyone's names and faces:** they stay on screen while a newer block is read, and when a later refresh fails. Before, each block turned them back into loading tiles.
  - **The reveal:** the cups stay up from the call until the reveal card closes, and the next round's shake waits for it. If the result never arrives, the board moves on after 6 seconds.
  - **The reveal card:** it keeps its content while it animates closed.
  - **The turn ring:** it's now an SVG circle that drains smoothly instead of jumping every second.
  - **The board's colours:** they're only rebuilt when a colour really changes, not whenever the page's classes change.
- **The top corner:** a raised wooden round badge (round number and dice in play) sits beside the bid badge.
- **The game clock (`GameClock`):** a wooden "Time" badge that turns red and blinks in the last minute.
- **Whose turn:** on your turn, a yellow "Your turn!" tag bounces in above your own face. On anyone else's turn, a wooden pill under the board pops in ("Ada is thinking…", `TurnBanner`).
- **Room for shadows:** the game screen has a little inner space, so the raised edges of buttons and badges aren't cut off.
- **Fixes from the full audit:**
  - **No double sends:** an action ignores presses while it's still running (`useAction`), so a second tap can't send a cash out, a table or a ready twice.
  - **Invites survive sign in:** the part of an invite link after `#` is kept through sign in (in the tab's session storage, tied to that table's page, used once), the welcome screen and the refresh page. A friend opening a private-table link before they have an account now lands on the table with the code. `safeNextPath` keeps the `#` part.
  - **While your bid lands:** the line under the board says "Placing your bid…" or "Confirm in your wallet" instead of "Your turn".
  - **Play now:** if the open tables couldn't be loaded, Play now offers to load them again instead of setting up a new table blind.
  - **Failed reads you can retry:** the winner on the results card, your next free chips, and the check for an unfinished cash out each show a short note with Try again. Cash out waits until that check has worked.
  - **Seat count checked once:** `toTable` refuses a table size other than 2, 3 or 4, so the game and waiting screens no longer cast it.
  - **Play now finds the newest tables:** it reads the open tables at the moment you press it, instead of using the list on screen, which refreshes every 6 seconds and only while the window is focused. Two players pressing Play now seconds apart now land at the same table.
  - **Rules broken through the wallet service are named:** when a sponsored move is refused, Privy returns the contract's error as raw data in its message. `explainProblem` now recognises the game's own errors there, such as "The table has moved on", instead of saying "Something went wrong".
  - **A move whose outcome is unknown:** when Privy's own request times out while Sepolia is slow, the move may still land. The app now says "This is taking a while. It may still go through, so watch the table." with no Try again button, which could send the move twice.
  - **Sign in after an expired session:** sign in and the refresh page now go on with a full page load (`lib/load-page.ts`) once the session cookie is renewed. Before, Next's in-page router replayed the redirect it had remembered from when the session expired, and left the player stuck on "Signing you in…".
  - **The reveal comes before your turn:** your controls, the "Your turn!" tag and the tips wait until the reveal card closes, instead of showing behind it.
  - **Seated elsewhere:** a player already seated at another table sees "You already have a seat at another table. Go back to it first." instead of a Join button that the contract would refuse. `useMyTableId` moved to the shared `hooks` so both the lobby and the table use it.
  - **The reveal card always arrives:** the live event watcher uses an RPC filter that lives on one server, and our transport falls back between two, so a round's `RoundSettled` event could be lost and the card never showed. While a reveal is waiting, `useRoundResultCatchUp` now also reads that round's result straight from the chain every 2 seconds (through the shared `gameClient`), from the block where the call was seen. Whichever arrives first is shown, once.
  - **Leaving a free game:** the leave dialog only warns about chips on a paid table; on a free one it says the game ends for you.
  - **Rules aren't retried:** when the contract refuses a move under a game rule (table full, already seated, not your turn), the toast names the rule with no Try again, which could never work.
  - **The waiting room fits short screens:** its board takes the largest square left, like the game screen, so the buttons never fall below a short window.
  - **Small fixes:** the "Your turn!" tag hides while your bid lands; a player who left shows as out on the results card; your chips refresh as soon as a paid game pays out; "No bid yet" is readable in the light theme.
  - **Accessibility:** your turn is announced to screen readers, and loading placeholders stop pulsing when the device asks for reduced motion.
- **Modals hold while they work (`holdOpenWhile` in `lib/hold-open.ts`):** cash out, create a table, open tables, the chips card and the player card stay open while their action runs. Trying to close one (outside tap, Escape or the close button) shows a toast instead, such as "Cashing out your chips… Please wait until it's done." The chips card now gets its state from `useChipBalanceButton`, so it knows when a claim or cash out is running. Working toasts can't be swiped away.
- **One toast at a time:** a new toast pushes out the one on screen. A working toast that gets pushed out ("Revealing dice…") comes back once the newer toast has gone, as long as its work isn't done yet.
- **Notices:** "Heron ran out of time and loses a die" and "Heron is out of dice" (or "You…"). Bids show on the table and round results on the reveal card, so neither raises a toast.
- **Dice faces (`DieFace`):** the pips sit in an inner layer, so a die stays its set size inside a wide row instead of growing blank.

- **Your dice (`useOwnDice`):**
  - They're decrypted through the permit only, with a **Show my dice** unlock for players using their own wallet, so no wallet is asked to sign out of the blue.
  - Each round is read separately at the newest block seen, so the last round's dice never show.
  - A value that isn't a real die is reported as a failure.
- **One screen at a time:** `TableScreen` now only reads the table, then mounts either the waiting screen or the game screen. So there's one event watcher and one keeper.
- **Shared pieces:**
  - **`lib/bid-rules.ts`:** a TypeScript mirror of `BidRules.sol`, tested on the same cases.
  - **`historyClient`:** now shared from `config/chain.ts` by the cash-out hook and the end of a game.
  - **`faceUpRotation`:** in the dice physics.

## Removed

- `GameOnView` ("Your game is on") and its strings `gameOn` and `gameScreenSoon`. A visitor to a started table sees "This game has started".
- `historyTransport`, replaced by the shared `historyClient`.
- `table-screen.test.tsx`'s waiting-room cases, which moved with their screen to `waiting-screen.test.tsx`.

## Verification

- **Vitest:** 661 passing, up from 504.
  - **Rules:** `bid-rules` (every legal bid for 2 to 9 dice in play, quick picks always legal), `bid-odds` (hand-worked chances), `bid-choice`, `game-line`, `payout`, `reveal`, `keeper-duty`, `notices` and `faceUpRotation`.
  - **Hooks:**
    - `useGame`: turns, bids shown at once and put back, calls, the timers, the round result and the revealed dice, players who are out, winners, leaving;
    - `useOwnDice`, `useBidChoice`, `useGameEnd`, `useGameBoard` (the throw happens on time even while the screen redraws), and the keeper and events hooks.
  - **Components:** the bid control, the reveal card, the game view, the results, seats (the turn ring, hidden dice, last bid chips), the leave confirmation, and the table screen's routing.
- **Preflight:** `pnpm preflight --fast` passed.
- **Running app:** see the pull request for the two-account game.
