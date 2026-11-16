# Plan: PR 5B, finish and polish the game

- **Scope:** the "5B: Finish and polish" row of the [game screen plan](2026-11-13-game-screen-plan.md), built on the merged 5A game screen.
- **Decisions it rests on (approved):** [game flow and timing](../adr/ADR-2026-11-10-game-flow-and-timing.md), [the web app](../adr/ADR-2026-11-11-web-app.md), [look, feel and sound](../adr/ADR-2026-11-11-look-feel-and-sound.md), [rule fixes](../adr/ADR-2026-11-14-rule-fixes.md).
- **No contract changes, no new packages.** Everything reads what `Bluff` 1.3.0 already exposes, and animates with `motion` and the existing 3D board.

## Two pull requests

5B touches the results card, the game screen and the board. To keep each review small, it ships as two pull requests, each usable on its own:

| PR                        | Delivers                                                   | Usable result                                  |
| ------------------------- | ---------------------------------------------------------- | ---------------------------------------------- |
| **5B-1: After the game**  | Play again, the round history, the first-game tips         | Players can go again, follow a round, learn it |
| **5B-2: Look and motion** | The simpler board, a lost die rolling off, cowries pouring | The game feels finished on every device        |

## 5B-1: After the game

### Play again

- **On the results card:** a **Play again** button (play icon) creates a new table with the last game's seats, buy-in and privacy, through the shared seat-taking hook (`useTakeSeat`), the same path as Create a table. On a paid table it pays the buy-in again; "not enough chips" shows as a toast, like the lobby.
- **Offering it to the others:** while the results card is open, it checks every other player from the last game every 6 seconds (`tableOf`, then `getTable`). If one of them now hosts a waiting table with the same seats and buy-in, created after this game ended, the card shows **Join Ada's new table** (or **Pay 10 chips and join**).
  - It reads the chain directly instead of watching for `TableCreated`, because events can be missed (the reveal-card bug).
  - It stops checking after 10 minutes, the waiting-room limit.
- **Private tables:** the new table is private too. Others can't join without its code, so their card says "Ada started a new private table. Ask Ada for the link", and Ada's waiting room already has **Copy invite link**.
- **Leaving:** **Back to the lobby** stays.

### Round history

- **Where:** a collapsible panel beside the board on laptop-width screens (`lg` and up). Phones don't get it, to keep their one-screen layout.
- **What:** this round's bids in order ("Ada: 3 × ⚃"), and one line per finished round ("Round 2: the bid held, Kola lost a die").
- **Where the data comes from:** `BidPlaced` and `RoundSettled` read from the chain for this table since its `GameStarted`, refreshed as new blocks are seen. Live events still update it straight away, and the chain read fills in anything missed, including after a reload.
- **States:** loading shows a placeholder line; an empty round says "No bids yet this round"; a failed read shows Try again.

### First-game tips

Three tips, each shown once, only in a player's first games, and remembered in the browser's saved settings (`settings-store`):

1. On your first turn: "Ones count as every face."
2. On your first raise: "Raise with more dice, or the same number on a higher face."
3. When you first see a bid you could call: "Think the bid is too high? Call the bluff."

They use the existing coach toast slot (one toast at a time, 10 seconds, a **Got it** button), so they never stack with the safe or risky tips. A tip takes the slot in place of that turn's safe or risky tip.

## 5B-2: Look and motion

### The simpler board

- **When:** the player picks Flat board in Settings, or the device has no WebGL. The 3D board is the default everywhere; calm motion and slow devices don't switch it (the maintainer's decision on 2026-11-16, which supersedes the automatic triggers first planned).
- **What:** a flat top-down board in CSS with the same seat colours, each player's cup with their dice count, your own dice faces, the pot and the reveal rows. It reads the same state as the 3D board.
- **Proof:** a test renders both boards from one game state and checks they show the same seats, dice counts, bid and reveal.

### Motion

- **A lost die rolls off:** after the reveal card closes, one die rolls from the loser's cup off the board edge. In 3D it's a short physics throw; on the simpler board, a slide and fade.
- **Cowries pour:** on a paid win, cowries pour onto the results card's "You won 20 chips".
- **Reduced motion:** both become short fades.

## Files

| Area                 | Files                                                                                                                 |
| -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| Play again           | `features/table/hooks/use-play-again.ts` (new), `results-card.tsx`, `copy.ts`                                         |
| Round history        | `features/table/hooks/use-round-history.ts` (new), `components/round-history.tsx` (new), `game-view.tsx`              |
| First-game tips      | `features/table/hooks/use-first-game-tips.ts` (new), `lib/settings-store.ts` (a `seenTips` list), `use-coach-tips.ts` |
| Simpler board (5B-2) | `components/board/flat-board.tsx` (new), `hooks/use-board-choice.ts` (new), `lazy-board.tsx`, `game-view.tsx`         |
| Motion (5B-2)        | `board-scene.tsx`, `flat-board.tsx`, `results-card.tsx`                                                               |

## Tests

Test-first, in Vitest:

- **Play again:** creating with the last settings; the offer appears only for a matching waiting table made after the end; private tables say to ask for the link; it stops after 10 minutes.
- **History:** order, round lines, merging live events with the chain read without duplicates, the loading, empty and failed states.
- **Tips:** each shows once, in order, then never again after **Got it**, and never alongside a coach tip.
- **Board choice (5B-2):** each trigger picks the simpler board; both boards show the same state.

Manual: a free and a paid game on Sepolia with both test accounts, Play again for both, a reload mid-game for the history, a fresh browser profile for the tips, and calm motion on for the simpler board.

## Removed

Nothing. The 5A screen stays; these add to it.
