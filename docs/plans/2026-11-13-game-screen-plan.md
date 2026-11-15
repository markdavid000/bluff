# The game screen: plan

PR 5 of the [web app plan](2026-11-11-web-app-plan.md#9-build-order): the game on the 3D board, start to finish. It's built on decisions already approved: [game rules](../adr/ADR-2026-11-10-game-rules.md), [game flow and timing](../adr/ADR-2026-11-10-game-flow-and-timing.md), [the web app](../adr/ADR-2026-11-11-web-app.md) and [look, feel and sound](../adr/ADR-2026-11-11-look-feel-and-sound.md). No contract changes: `Bluff` 1.2.0 already has every move, view and event this needs.

## Two pull requests

PR 5 is too big to review well as one change, so it ships as two, each usable on its own:

| PR                        | Delivers                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | Usable result                |
| ------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- |
| **5A: Play a game**       | <ul><li>The game view on the board: your dice (cup shake and throw), every cup with its dice count, the bid marker, and the pot.</li><li>The bid picker and **Call bluff**.</li><li>The reveal and the round result.</li><li>Turn countdown and game clock.</li><li>The keeper for reveals, timeouts and stuck reveals.</li><li>Notices for bids, calls, results, timeouts and players knocked out.</li><li>A results card: winner, chips won, final dice, Back to the lobby.</li></ul> | A full game, start to finish |
| **5B: Finish and polish** | <ul><li>**Play again**: same settings, everyone from the last game is offered the new table.</li><li>The CSS fallback board, used without WebGL, with reduced motion or on a slow device.</li><li>The round history panel on laptops.</li><li>The three first-game tips.</li><li>Losing a die rolls it off the side, and a win pours the cowries.</li></ul>                                                                                                                             | The game feels finished      |

This plan covers both. 5A is built first, and 5B starts after 5A is merged.

## What players get (5A)

- **The board stays in the middle.**
  - Your seat is at the bottom, with your face, name and turn countdown.
  - Every other player sits on their side with their face, name, and a cup showing how many dice they have left.
  - The cowrie pot sits in the centre, and the bid marker ("4 × five") on the board.
- **A new round:** your cup shakes, then your dice are thrown and land on their real faces once your app has decrypted them. They're decrypted only on your device, and only you can see them. Other players' cups shake once.
- **One line says what to do:**
  - "Your turn: raise the bid or call bluff";
  - "You start. Make the first bid";
  - "Sly Fox is thinking…";
  - "Revealing dice…".

  It's also read out to screen readers.

- **The action dock** under the board holds only what you can do now:
  - **Your turn:** the bid picker and **Call bluff on Sly Fox**.
  - **Someone else's turn:** their name and countdown.
  - **Always:** **Leave the table**, which asks first.
- **The bid picker**, as specified in the web app plan:
  - a grid of quantities (rows) and faces 2 to 6 (columns), with every bid that isn't higher dimmed;
  - 3 one-tap quick picks;
  - a button that spells out the bid ("Bid 5 × five");
  - "Your dice that count for fives: 2", counting ones as every face;
  - at the top bid, only Call bluff remains;
  - keyboard: arrows skip dimmed cells, Enter bids, B calls.
- **Calling a bluff:** the cups lift, everyone's dice are shown on their side, and a result tile reads "There were 5 × five, counting ones. Heron loses a die" for 5 seconds. Then the next round, already rolled by the contract, begins.
- **Timers:**
  - **Turn:** a 30-second countdown on the player whose turn it is. It pulses for the last ten seconds, and "Ten seconds left" is announced on your own turn. The contract allows 45.
  - **Game clock:** 15 minutes, in the top bar.
- **Running out of time:** if a player's 45 seconds pass, every app claims the timeout and the idle player loses a die. After two missed turns they're out.
- **The end:** a results card with the winner (or winners, if the clock ran out on a tie), "You won 18 chips" for a paid table, every player's final dice, and **Back to the lobby**.
- **Notices** for other players' moves:
  - "Sly Fox bid 4 × five";
  - "Kola called Sly Fox's bluff on 4 × five";
  - "Kola says you are bluffing!";
  - "Heron loses a die";
  - "Heron ran out of time";
  - "Heron is out";
  - "Sly Fox wins".

  As in the waiting room, your own moves are never echoed back to you.

## Screen sketch (phone, portrait)

```
┌────────────────────────────────────────┐
│ Round 3 · ⏱ 11:20            ◉ pot 40  │
│        (🧕) Ada · 2 dice · 0:21         │
│              [ cup ▢▢ ]                 │
│ (👳) Kola ┌──────────────────┐ (🧑) Ife │
│ 3 dice   │  mahogany board   │ 1 die   │
│ [cup▢▢▢] │  ◉◉ pot  [4 × ⚄]  │ [cup▢]  │
│          └──────────────────┘          │
│        [ ⚄ ⚀ ⚂ ⚅ ]  your dice           │
│          (😀) You · 4 dice              │
│  "Your turn: raise the bid or call"     │
│ ┌────────────────────────────────────┐ │
│ │ Quick: [4×⚅] [5×⚁] [5×⚄]            │ │
│ │ grid 5..8 × ⚁⚂⚃⚄⚅                   │ │
│ │ [ BID 5 × FIVE ]  [ CALL BLUFF ]    │ │
│ └────────────────────────────────────┘ │
│                         [ Leave ]       │
└────────────────────────────────────────┘
```

On a laptop the board is up to 720 px wide and the dock sits under it. The players stay on the board's edges, as in the waiting room.

## How it works (5A)

| Piece                                                                   | Where                                                            | What it does                                                                                                                                                                                                                                                                                                                         |
| ----------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `bid-rules`                                                             | `lib/bid-rules.ts`                                               | A TypeScript mirror of `BidRules.sol`: valid face, valid quantity, `isHigher`, `isMaximal`, `countMatching` (ones are wild), plus `legalBids(table)` and `quickPicks(bid, diceInPlay)`. It's tested against the same cases as the contract.                                                                                          |
| Table view                                                              | `features/table/lib/table-view.ts`                               | Extended with the game fields: each seat's dice and missed turns, plus `round`, `turn`, `roundStarter`, `bid` (or `null` when the quantity is 0), `caller`, `dicePerPlayer`, `diceInPlay` and `startedAt`.                                                                                                                           |
| `useOwnDice(id, round)`                                                 | `features/table/hooks`                                           | Reads `diceOf(id, me)` for the current round and decrypts it through the permit with `useDecryptValues`. It decrypts only once the permit covers `Bluff`. Otherwise it returns `locked` with an unlock action, so no wallet is asked to sign unprompted. It never shows the last round's dice for this one.                          |
| `useGame(id)`                                                           | `features/table/hooks`                                           | Composes the game view from `useTable`, `usePlayerProfiles`, `useOwnDice`, `useTableEvents` and the keeper, like `useWaitingRoom`. It holds the actions `placeBid`, `callBluff` and `leave` through `useAction`, with the bid shown at once while it lands. It also gives the line, the turn countdown, the game clock and the role. |
| `useBidDraft`                                                           | `features/table/hooks`                                           | The bid being chosen, through `useReducer`: select, quick pick, keyboard moves that skip illegal cells, and clear on a new bid.                                                                                                                                                                                                      |
| `useRoundResult(id)`                                                    | `features/table/hooks`                                           | Keeps the latest `RoundSettled` from the event watcher (faces, count, loser) for 5 seconds, so the reveal stays on screen while the next round starts.                                                                                                                                                                               |
| Keeper                                                                  | `features/table/lib/keeper-duty.ts`, `hooks/use-table-keeper.ts` | New duties: `settleReveal` as soon as the table is `revealing`; `claimTimeout` once a turn's 45 s pass; `cancelStuckReveal` once a reveal's 10 minutes pass. As now, players go in seat order with 8 s between them, re-reading before they send. Players who are out still help, and watchers never send.                           |
| Notices                                                                 | `features/table/lib/notices.ts`                                  | `BidPlaced`, `BluffCalled`, `RoundSettled`, `TurnTimedOut`, `PlayerEliminated` and `GameEnded` are added, and the player's own moves are still never echoed.                                                                                                                                                                         |
| Board                                                                   | `features/table/components/board/board-scene.tsx`                | Adds: dice counts on each cup, every seat's dice shown face up on the reveal (each thrown from its own side), dice that count for the bid glowing, and the bid marker. Your own shake and throw stay as in the preview.                                                                                                              |
| `GameView`, `BidPicker`, `ActionDock`, `ResultsCard`, `RoundResultTile` | `features/table/components`                                      | The screen. `TableScreen` shows `GameView` for `playing` and `revealing`, and `ResultsCard` for `finished`.                                                                                                                                                                                                                          |

## Wording (5A, in `features/table/copy.ts`)

`yourTurn`, `youStart`, `theirTurn(name)`, `revealing`, `bid(quantity, face)`, `bidButton(quantity, face)`, `pickABid`, `callBluffOn(name)`, `onesAreWild`, `yourCount(face, count)`, `topBid`, `mustBeHigher`, `roundResult(count, face)`, `lostADie(name)`, `youLostADie`, `timeLow`, `ranOutOfTime(name)`, `isOut(name)`, `winner(name)`, `winners(names)`, `youWon(chips)`, `diceLeft(count)`, `round(n)`, `gameClock`, `showMyDice` (the unlock), `placingBid`, `callingBluff`, and the notices listed above. All of it passes `pnpm copy:check`.

## Tests (5A)

- **`bid-rules`:**
  - **Rules:** the same cases as `BidRules.sol`'s tests; every legal bid for 2 to 9 dice in play is offered and every illegal one isn't.
  - **Quick picks:** always legal.
  - **The top bid:** leaves no bid.
  - **Counting:** ones count as every face.
- **Table view:** the game fields, no bid, a finished game, a removed seat.
- **`useOwnDice`:**
  - loading, decrypted, locked and unlocking, and failed with retry;
  - never decrypting before the permit covers it;
  - never showing the last round's dice;
  - a watcher never asking.
- **`useBidDraft`:** select, quick pick, keyboard skipping dimmed cells, and reset on a new bid.
- **`useGame`:**
  - **Roles:** your turn, someone else's turn, the first bid of a round, the top bid.
  - **Moves:** placing a bid (shown at once, put back on failure); calling (with the bidder's name).
  - **Timers:** the countdowns, including 30 s shown against 45 s enforced.
  - **Leaving:** asks first.
- **`useRoundResult`:** shown for 5 s, then cleared; a newer round replaces it.
- **Keeper:**
  - each new duty and its timing;
  - the stagger, a fresh read stopping a duplicate, and losing the race counted as done (as fixed in PR 4);
  - watchers never sending; timers cleared on unmount.
- **Notices:** each new event, never echoing your own move, and the names.
- **Components:**
  - **`BidPicker`:** the grid, dimmed cells, quick picks, the spelled-out button, your count, the top bid, no Call bluff before the first bid, the keyboard, and the labels read out.
  - **`ActionDock`:** shows only what you can do now, for every status and turn.
  - **`GameView`:** loading, playing, revealing, the result tile, your dice locked or failed.
  - **`ResultsCard`:** one winner, a shared win, a paid table, a free table.
  - **Accessibility:** your turn, a call and a lost die are announced.
- **Sepolia, two accounts:** a free and a paid game played to the end, with a call each way and one timeout, and the winner's chips checked.

## Removed (5A)

`GameOnView` ("Your game is on") and its copy (`gameOn`, `gameScreenSoon`), since `GameView` replaces them. The leave confirmation moves into the dock. `use-leave-confirm.ts` stays, now used by the dock.

## 5B in brief

Its own plan section is written when 5A is merged, but the shape is:

- **Play again:** the host's new table is offered to everyone from the last game, by watching for `TableCreated` from those players for a few minutes after the end. No contract change.
- **CSS fallback board:** used without WebGL, at under 30 fps, or with reduced motion. It reads the same state, and a test proves both boards show the same seats, cups and bid.
- **Round history:** the bids so far in a collapsible panel on laptops.
- **First-game tips:** three, dismissed once and remembered.
- **Motion:** a lost die rolls off, cowries pour to the winner, and reduced motion swaps both for fades.

## Redesign after the first playtest (5A)

The maintainer played the first build and found it cluttered: too much on screen, a scrolling page, and a bid grid that was hard for a first-time player. They shared three recordings of other Liar's Dice games and asked for that experience, keeping Bluff's look. The screen is rebuilt on these points from the recordings; everything underneath (dice, keeper, timeouts, events, results) stays.

- **One screen, no scrolling.** The game fits the viewport on a phone and a laptop: a slim top strip, the board, then the bid control.
- **The current bid is the centrepiece.** It sits large in the middle of the board ("3 dice showing ⚃, by Ada, ones count as wild"), or "No bid yet. Make the first bid".
- **Dice on every side.**
  - **Opponents:** each shows face-down tiles, one per die, so their count needs no words.
  - **You:** your dice show their real faces, and the ones that count for the face you're choosing light up.
- **Each player's last bid** shows as a small chip by their avatar for the rest of the round.
- **The turn timer** is a ring around the thinking player's avatar. It drains over the 30 seconds, from green through yellow to red, with no numbers. The last ten seconds are still announced to screen readers.
- **The bid control:**
  - a quantity stepper (− 3 +) and the faces 2 to 6, starting on the lowest legal bid (your strongest face for the first bid of a round);
  - a preview, "Your bid: 4 × ⚃", with a risk word (Safe, Risky, Very risky) worked out from your own dice and the hidden dice;
  - **RAISE** and **CALL LIAR** side by side, plus three quick picks.
- **The reveal** is one moment:
  - **On the board:** every die is shown, with the counting ones glowing.
  - **A card:** "Bluff caught!" or "The bid holds", with each player's dice and match count, who bid, who called, and who loses a die.
  - **Closing it:** **Continue**, or it closes on its own after 6 seconds.
- **Less text.**
  - **Gone:** bids and calls no longer raise toasts, because the chips and the reveal card show them; the countdown badges are gone.
  - **Still shown:** one short line says whose turn it is, and timeouts and players knocked out still get a notice.

Removed with the first build: the bid grid (`BidPicker`, `bid-grid`, `useBidDraft`, `useFocusFollows`), the `ActionDock`, the round result tile, the turn countdown badge, and the bid and call notices with their copy.
