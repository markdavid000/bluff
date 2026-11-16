---
date: 2026-11-16
branch: feat/game-look-motion
base: dev
scenario-impact: needs_automation
---

# A flat board for every device, calm motion, and a little more life

PR 5B-2 of the [game finish plan](../plans/2026-11-16-game-finish-plan.md). Devices without 3D, slow devices and players who want less motion get a flat board that shows the same game. Calm motion is now a switch in the header. A lost die rolls off its player's row once the reveal closes, and cowries pour onto a paid win.

## Changes

- **Flat board (`FlatBoard`):** a tilted CSS board with the same seat-colour corners, calabash cups, pot stacks, centre ring, your thrown dice and everyone's revealed dice, with the counting ones glowing. Its cups move by the same `cupMotion` rule as the 3D board.
- **`GameBoard`** picks the board everywhere: the game, the waiting room and the design preview. It shows the flat board when:
  - there's no WebGL;
  - motion should be calm;
  - the 3D board runs under 30 frames a second for 3 seconds in a row, after which the flat board stays for the rest of the visit.
- **Calm motion:**
  - A new header tile, "Calm the motion" or "Bring back full motion", turns on the saved `calmMotion` setting, which nothing used before.
  - `useCalmMotion` (device or setting) replaces `useReducedMotion` in every component.
  - A `calm:` style variant (device or setting) replaces `motion-reduce:`.
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
  - calm motion and its header switch;
  - the lost die held during the reveal and then rolling off;
  - the cowrie pour.
- **`pnpm preflight`:** passes.
- **In the browser, on `/design`:** the 3D board, then calm motion on swaps in the flat board in the same space. Shake and throw, and Lift the cups, behave as in 3D. Turning calm motion off brings back the 3D board, with no console errors.
- **Not checked live:** a full game on the flat board, the slow-frame switch on a real slow device, and the cowrie pour and rolling die on Sepolia. They're covered by tests.
