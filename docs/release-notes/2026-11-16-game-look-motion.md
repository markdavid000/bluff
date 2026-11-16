---
date: 2026-11-16
branch: feat/game-look-motion
base: dev
scenario-impact: needs_automation
---

# A flat board for every device, calm motion, and a little more life

PR 5B-2 of the [game finish plan](../plans/2026-11-16-game-finish-plan.md). The 3D board is the default everywhere. Players can switch to a flat board that shows the same game in a new Settings menu, and devices that can't draw 3D get it automatically. Calm motion is now a setting too. A lost die rolls off its player's row once the reveal closes, and cowries pour onto a paid win.

## Changes

- **Flat board (`FlatBoard`):** a top-down CSS board that fits its square, with the same seat-colour corners, calabash cups, pot stacks, centre ring, your thrown dice and everyone's revealed dice, with the counting ones glowing. Its cups move by the same `cupMotion` rule as the 3D board.
- **Settings menu:** the header's settings tile opens **Board**, with 3D board (the default) or Flat board saved as `board`, and **Calm motion** saved as `calmMotion`, which nothing used before.
- **`GameBoard`** picks the board everywhere (the game, the waiting room and the design preview). It's the flat board only when the player chose it or the device has no WebGL. Calm motion and a slow device don't change the board, at the maintainer's request.
- **Calm motion:** `useCalmMotion` (device or setting) replaces `useReducedMotion` in every component, and a `calm:` style variant (device or setting) replaces `motion-reduce:`.
- **A lost die tumbles away:** when anyone loses a die, including the player, a full-size die tumbles away from that seat for about a second, or shrinks and fades in place with calm motion. The seat keeps its old count from the bluff call until the reveal card has fully left the screen. The card reports when its closing animation ends, because a window in the background pauses it.
- **Results after leaving a game:** a player who leaves mid-game now sees a results card instead of the lobby, for free and paid games alike:
  - In a 2-player game, the game ends and they see the winner, with "You left the game, so Maki won."
  - When the others play on, they see "You left the game" with "The others play on."
  - The game screen stays, saying "Leaving the table…", until the outcome is known, so the card appears once, already correct.
- **First-game tips move to a dialog before the game:** the four tips no longer pop up as toasts during play. A player who hasn't seen them gets a "Before you play" dialog in the waiting room: one tip per card with a picture, "Tip 1 of 4", Next tip, and Got it. Closing it counts as seen. **Game tips** in the Settings menu brings them back from any screen. The safe and risky hints during play are unchanged.
- **Cowries pour:** eight cowries tumble onto "You won 20 chips" on a paid win. With calm motion there's no pour.

## Changes after review

- **No flash when leaving:** leaving a waiting room or a game, or closing a table, flashed two things before the lobby settled. Both are fixed:
  - The table page redrew with the fresh read (a visitor's Join card, or "This table has closed"). The table's read now stops the moment the player leaves, and the refresh skips it.
  - The lobby briefly showed "Your table — Back to your table" from the remembered seat. Leaving now clears that seat, if it still points at the table just left.
  - A recorder in the browser confirmed both paths go straight to the lobby.
- **The lost die behind the card:** recorded live, a window in the background paused the card's closing, so the die rolled while the card was still up when the player came back. Seen in front, the die rolls after the card has gone.
- **The leave confirmation:** a new test covers "Leave this game?" in a game, and it showed live. Leaving a waiting room still doesn't ask, as before.
- **The settings tile is in full colour,** since it opens a menu rather than switching something off.

## Flash audit

Every path between screens was recorded live, screen by screen, and each wrong in-between screen was fixed at its cause. Easing made one-frame blips last half a second, so each one had to go, not be hidden:

- **Going to a new table** (Create, Play now, Join from the list, Play again): a shared `useGoToTable` reads the table into the cache before opening it, so the "Setting up the table…" screen no longer shows. The lobby hides its "Your table" card for the table it's heading to, and each button stays busy until the table opens.
- **Joining from a link:** "Joining the table…" holds until the new seat shows, so Join doesn't come back, and no reason not to join shows while the join lands.
- **Starting a game:** "Starting the game…" holds until the table has started, so Start doesn't come back.
- **Calling a bluff:** the turn isn't handed back while the call is reaching the table, so the bid controls don't reappear.
- **Your own bid:** the bid badge and the rounds panel show it with your name at once, not about 13 seconds later.
- **Names:** while a newcomer's name loads, everyone else keeps their name, instead of all reading "Player". Seats show a quiet placeholder rather than "Player"; sentences fall back to "Player".
- **The 3D board loading:** the board space stays empty, with "Setting up the table…" for screen readers only.
- **The end of a game:** the results card waits until the winner is known, instead of "The game is over" then "You win!". When a game ends or a table closes, the remembered seat is cleared, so Back to the lobby doesn't show "Your table".

- The small face-down tile sliding off an opponent's row, replaced by the tumbling die.
- The per-turn tip toasts (`useFirstGameTips`) and the coach's pause for them.
- `lazy-board.tsx`, `LazyBoardScene` and `BoardPlaceholder` as exports. `GameBoard` now owns the lazy 3D scene and its placeholder.
- Direct uses of `useReducedMotion` and `motion-reduce:`, replaced as above.

## Verification

- **New Vitest tests:**
  - the frame watch;
  - the board choice (3D by default, flat by choice or without WebGL);
  - the flat board's seats, cup rule, thrown dice, revealed dice and pot;
  - `GameBoard`;
  - calm motion;
  - the settings menu's board choice and calm motion;
  - the lost die held during the reveal and then rolling off;
  - the cowrie pour;
  - the dice held until the card has fully left the screen, and the tumbling die for every seat;
  - the results after leaving, for a game that ends and one that goes on;
  - the tips dialog, its hooks and Game tips in Settings;
  - freezing the table read after leaving;
  - clearing the remembered seat;
  - the leave confirmation in a game;
  - the settings tile's colour.
- **`pnpm preflight`:** passes.
- **In the browser:**
  - On `/design`, the flat board swaps in the same space, and Shake and throw and Lift the cups behave as in 3D.
  - In a waiting room, the flat board now sits inside its square, clear of the player's face.
  - The tips dialog shows in the waiting room, steps from 1 to 4, and closes on Got it, remembering all four.
  - Settings shows 3D board ticked by default, and Flat board as the only other choice. Calm motion on keeps the 3D board. No console errors.
- **Not checked live:** a full game on the flat board, and the cowrie pour and rolling die on Sepolia. They're covered by tests.
