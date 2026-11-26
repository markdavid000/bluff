---
date: 2026-11-25
branch: perf/board-and-network
base: dev
scenario-impact: none
---

# A lighter board and quieter network

The 3D board now draws only while something on it moves, and slow graphics chips get the flat board. The landing page loads its demo board and the dice roll only when the demo is on screen. Hidden tabs stop polling the chain, and the lobby and your own dice ask the chain far less often. **No contract change, no new package.**

## Changes

- **The 3D board draws on demand** (`board-scene.tsx`). The canvas uses `frameloop="demand"`, so an idle board draws no frames. Every animation asks for the next frame while it runs and stops once it is still, through `useFramesWhileMoving`:
  - the cups (shake, lift, slide back), with their easing moved unchanged into `cupStep` in `lib/cup-motion.ts`;
  - the thrown dice, which stop asking once the recorded throw has played (`lib/roll-frame.ts`).
  - The orbit controls already ask for frames while dragged or settling.
  - The frame time a cup eases by is capped at 1/30 s, so the first frame after a pause doesn't jump.
  - The pixel ratio is capped at 1.5 instead of 2.
  - The contact shadows still redraw on every frame that is drawn, so rolling dice and lifted cups keep their shadows. An idle board draws no frames, so it draws no shadows either.
  - A paused board (`paused`) uses `frameloop="never"`.
- **Slow graphics chips get the flat board.** The device check (`lib/graphics.ts`) asks for 3D with `failIfMajorPerformanceCaveat`, so software or very slow graphics count as weak and get the flat board. Every test drawing surface is released with `WEBGL_lose_context`.
  - A board the player picks in Settings always wins: Settings records `boardPicked`, and a player who picks 3D on a weak device keeps it.
  - The Settings menu shows the board actually drawn, and only checks the device when the menu opens.
  - The check now lives in `hooks/use-board-setting.ts`, which the table feature and the Settings menu share.
- **The landing demo waits until it is on screen** (`useOnScreen`). Until the demo is first seen, its spot holds the existing board placeholder (same square, no layout shift), the 3D code isn't fetched and no cup shakes. Scrolled away, the board is paused and the demo round waits where it is.
- **The dice physics loads when a throw is first needed.** `cannon-es` moved behind a dynamic `import()` in `useDiceThrow`, which starts loading when the cup starts shaking, 650 ms before the throw. The board's die sizes and face turns moved to `lib/dice-geometry.ts`, which doesn't need the physics. A throw asked for before the physics arrives lands as soon as it does, unless the cup was put down first.
- **Hidden tabs stop polling.** `usePageVisible` follows the tab's visibility. The block watcher (`useFollowChain`) and the table's event watcher are off while the tab is hidden. When the tab is shown again, the block watcher reads the newest block at once (`emitOnBegin`), and the table and dice reads follow it.
- **The lobby's games in play:**
  - refresh every 60 s for the button's count, and every 10 s only while the Watch list is open, with an immediate refresh as it opens;
  - read every table in one multicall instead of one call per game;
  - look back 600 blocks (about 2 hours of Sepolia) instead of 150 (about 30 minutes). A game lasts its 15-minute game clock plus a last round, and that round's reveal can take up to the 10-minute verification and 10-minute stuck-reveal limits, so 30 minutes missed long games. The search uses the history client, like the other wide log searches.
- **Your own dice are read once per round.** The dice read is pinned to the block at which the round was first seen, instead of to every new block. It is keyed by table, player and round, so a new round always reads afresh and last round's dice are never shown.

## Removed

- `features/table/lib/webgl.ts` (`supportsWebGL`), replaced by `lib/graphics.ts`.
- `board` and `chooseBoard` from `useScreenControls`, now in `useBoardSetting`.
- The cannon-based `faceUpRotation` and `turnBetween` in `lib/dice-physics.ts`, replaced by plain maths in `lib/dice-geometry.ts`, which a test proves matches the physics library exactly for all 36 face pairs.

## Measured

| Production build                              | Before                  | After                           |
| --------------------------------------------- | ----------------------- | ------------------------------- |
| Landing first-load JavaScript, gzipped        | 314 KB (on 2026-11-24)  | 292 KB                          |
| Dice physics chunk (23 KB gzipped)            | in the landing's load   | loaded when a cup first shakes  |
| 3D board chunk with three.js (245 KB gzipped) | after the landing loads | only once the demo is on screen |
| Idle 3D board                                 | a frame every refresh   | no frames                       |

The "before" landing figure is from the landing-weight release note, built a day earlier on `dev`.

## Verification

- Tests added or changed, each failing first:
  - `board-scene.test.tsx`: demand frameloop, the 1.5 pixel cap, and no frames while paused;
  - `use-frames-while-moving.test.ts`, `cup-motion.test.ts` and `roll-frame.test.ts`: frames are asked for while a cup or the dice move and stop after;
  - `graphics.test.ts`, `use-board-choice.test.ts` and `screen-controls.test.tsx`: weak, missing and full graphics, the released probe, and the player's pick winning;
  - `use-on-screen.test.ts`, `use-demo-round.test.ts` and `demo-game.test.tsx`: nothing loads or shakes before the demo is seen, and it pauses off screen;
  - `use-dice-throw.test.ts`: no physics before a shake, the same dice for the same seed, a late throw dropped after a reset;
  - `dice-geometry.test.ts`: identical face turns to cannon-es;
  - `use-page-visible.test.ts`, `use-block-clock.test.ts` and `use-table-events.test.ts`: watchers off while hidden and back on when shown;
  - `use-games-in-play.test.tsx` and `use-lobby.test.ts`: the 600-block window, one multicall, the 60 s and 10 s refreshes, and the refresh on opening;
  - `use-own-dice.test.ts`: one read per round, not per block.
- The board's look and animation under on-demand drawing still needs checking in a browser: the cup shake, lift and slide back, the dice roll and settle, orbiting, and the landing demo on a phone.
