---
date: 2026-11-26
branch: fix/accessibility-and-phones
base: dev
scenario-impact: none
---

# Easier to play by keyboard, screen reader, calm motion and small phones

Keyboard players no longer lose their place after every move, screen readers hear the first bid of each round, calm motion now calms the 3D board and takes effect before the page draws, the settings switches say one clear thing, the bid controls fit small phones, and switching accounts no longer shows the last account's seat or chips. **No contract change, no new package.**

## Changes

- **Focus follows the turn** (`hooks/use-turn-focus.ts`, `game-view.tsx`, `bid-control.tsx`, `reveal-card.tsx`). When the bid controls appear on the player's turn, focus moves to Raise (or Call bluff when no raise is possible). It moves only when focus is on nothing or on the table heading, so it never pulls focus out of a dialog or a field. When the reveal card closes, focus goes to Raise on the player's turn and otherwise to a new visually hidden `h1` naming the table (`tabIndex={-1}`), using Radix's `onCloseAutoFocus` with `preventDefault`.
- **The first bid of a round is announced** (`current-bid.tsx`). A single visually hidden `aria-live="polite"` region now sits outside the bid's swap animation and always holds the current bid sentence. The live regions inside the swapped pills, and the pill's duplicate hidden sentence, are gone.
- **Calm motion on the 3D board** (`lib/cup-motion.ts`, `lib/roll-frame.ts`, `board/board-scene.tsx`). With calm motion on, from the device setting or the in-app one, the cups never wobble or hop, lifted and returning cups jump straight to place, and thrown dice show their final pose without tumbling. `calm` is part of each frame-loop wake key, so the on-demand board still redraws when things jump. Without calm motion the board moves exactly as before.
- **Calm motion before the page draws** (`lib/theme.ts`). The boot script that sets `dark` also sets `calm` from the saved `calmMotion` setting, so endless animations don't run until the app loads. If storage can't be read, it warns and leaves `calm` off as before.
- **Bid controls on small phones** (`bid-control.tsx`, `game-view.tsx`). Below 23rem wide or 44rem tall (`SMALL`), the bid control is compact. The faces sit on their own row, the stepper sits beside Raise with 44 px − and + buttons, and Raise and Call bluff use the small button size. On a touch screen of any size the − and + buttons are also 44 px (`pointer-coarse:size-11`). Otherwise the control looks exactly as before.
- **Settings switches say one thing** (`components/shared/screen-controls.tsx`, `copy.ts`). The night and sounds switches keep a fixed name ("Night mode", "Sound effects"), and `aria-pressed` says whether each is on. Their names used to flip with the state ("Switch to day" while pressed). The music button opens a menu, so its name ("Choose the music") is unchanged.
- **No other account's data after switching accounts** (`lib/query-client.ts` and the account reads). Reads keyed by the signed-in account opt out of the global `keepPreviousData` placeholder with `ACCOUNT_READ`: `tableOf`, the confidential chip balance, `nextClaimAt` (welcome and claim), the dollar balance for cash-out, the pending cash-out search and the game log. The game history pages keep their previous page only for the same account. The global default stays for everything else, including the block-pinned table and dice reads. `usePlayer` already ignored placeholder data.

## Removed

- `sharedCopy.switchToNight`, `switchToDay`, `soundsOff` and `soundsOn`, replaced by `nightMode` and `soundEffects`.
- The `aria-live` attributes on the swapped bid pills, and the pill's hidden bid sentence.

## Verification

- **Vitest, red first:** `use-turn-focus` through `game-view.test.tsx` ("keyboard focus"), `current-bid.test.tsx`, `cup-motion.test.ts` and `roll-frame.test.ts` (calm cases), `theme.test.ts` (calm boot and blocked storage), `game-view.test.tsx` ("on a small phone"), `screen-controls.test.tsx` (fixed names with `aria-pressed`), `use-my-table-id.test.tsx` and `use-chip-balance.test.tsx` (account switch).
- **Existing test changed:** the `useMediaQuery` mock in `game-view.test.tsx` now answers the wide and small queries separately.
- **Needs a real device:** focus and announcements with VoiceOver and TalkBack, the compact layout at 360×640 and 375×667, and the calm board with the OS setting and the in-app setting.
- **`pnpm preflight` and the running app:** left to the maintainer.
