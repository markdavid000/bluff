---
date: 2026-11-16
branch: feat/game-look-motion
base: dev
scenario-impact: needs_automation
---

# A flat board for every device, calm motion, and a little more life

PR 5B-2 of the [game finish plan](../plans/2026-11-16-game-finish-plan.md). Players can choose the 3D or the flat board in a new Settings menu. Left on Pick for me, devices without 3D, slow devices and calm motion get the flat board, which shows the same game. Calm motion is now a setting too. A lost die rolls off its player's row once the reveal closes, and cowries pour onto a paid win.

## Changes

- **Flat board (`FlatBoard`):** a top-down CSS board that fits its square, with the same seat-colour corners, calabash cups, pot stacks, centre ring, your thrown dice and everyone's revealed dice, with the counting ones glowing. Its cups move by the same `cupMotion` rule as the 3D board.
- **Settings menu:** the header's settings tile opens **Board**, with Pick for me, 3D board or Flat board saved as `board`, and **Calm motion** saved as `calmMotion`, which nothing used before.
- **`GameBoard`** picks the board everywhere: the game, the waiting room and the design preview.
  - The player's choice wins.
  - The flat board is always used when the device has no WebGL.
  - On Pick for me, it's also used when motion should be calm, or when the 3D board runs under 30 frames a second for 3 seconds in a row. Pauses longer than a quarter of a second, like a hidden tab, don't count. After that, it stays flat for the rest of the visit.
- **Calm motion:** `useCalmMotion` (device or setting) replaces `useReducedMotion` in every component, and a `calm:` style variant (device or setting) replaces `motion-reduce:`.
- **A lost die rolls off:** a seat keeps its old dice count while the reveal card is open. When the card closes, the lost face-down die rolls off the end of the row, or fades with calm motion. This plays on the seat's dice row, so it looks the same on both boards, in place of the plan's separate physics throw in 3D.
- **Cowries pour:** eight cowries tumble onto "You won 20 chips" on a paid win. With calm motion there's no pour.

## Removed

- `lazy-board.tsx`, `LazyBoardScene` and `BoardPlaceholder` as exports. `GameBoard` now owns the lazy 3D scene and its placeholder.
- Direct uses of `useReducedMotion` and `motion-reduce:`, replaced as above.

## Verification

- **New Vitest tests:**
  - the frame watch;
  - the board choice for each trigger;
  - the flat board's seats, cup rule, thrown dice, revealed dice and pot;
  - `GameBoard`;
  - calm motion;
  - the settings menu's board choice and calm motion;
  - pauses not counting as a slow board;
  - the lost die held during the reveal and then rolling off;
  - the cowrie pour.
- **`pnpm preflight`:** passes.
- **In the browser:**
  - On `/design`, the flat board swaps in the same space, and Shake and throw and Lift the cups behave as in 3D.
  - In a waiting room, the flat board now sits inside its square, clear of the player's face.
  - Choosing 3D board in Settings brought back the 3D board with calm motion still on, with no console errors.
- **Not checked live:** a full game on the flat board, the slow-frame switch on a real slow device, and the cowrie pour and rolling die on Sepolia. They're covered by tests.
