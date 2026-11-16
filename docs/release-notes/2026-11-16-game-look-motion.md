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
- **A lost die rolls off:** a seat keeps its old dice count while the reveal card is open. When the card closes, the lost face-down die rolls off the end of the row, or fades with calm motion. This plays on the seat's dice row, so it looks the same on both boards, in place of the plan's separate physics throw in 3D.
- **Cowries pour:** eight cowries tumble onto "You won 20 chips" on a paid win. With calm motion there's no pour.

## Removed

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
  - the cowrie pour.
- **`pnpm preflight`:** passes.
- **In the browser:**
  - On `/design`, the flat board swaps in the same space, and Shake and throw and Lift the cups behave as in 3D.
  - In a waiting room, the flat board now sits inside its square, clear of the player's face.
  - Settings shows 3D board ticked by default, and Flat board as the only other choice. Calm motion on keeps the 3D board. No console errors.
- **Not checked live:** a full game on the flat board, and the cowrie pour and rolling die on Sepolia. They're covered by tests.
