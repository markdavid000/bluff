---
date: 2026-11-12
branch: feat/design-pass
base: dev
scenario-impact: none
---

# The look, feel and sound of Bluff, as a sample page

A `/design` page shows Bluff's look, for the owner to approve before the real screens are built:

- the day and night palette, and easy-to-read type;
- raised buttons with 3D icons and their own sounds;
- tilting cards, and wooden toast tiles for bids and bluff calls;
- adire-style frames;
- a 3D Ludo-style table at a fixed size that can be turned in any direction by dragging, with carved calabashes, four equal chip stacks in the pot, and dice that tumble with real physics;
- talking drum, shekere and djembe sounds, and table music that starts on the first tap anywhere, each with its own switch.

## Changes

- Theme tokens in `globals.css` for day and night: board, tiles, wooden toasts, cowrie, pattern, and the four seat colours. **Irish Grover** for headings, buttons and game labels and **Nunito** for body text, through `next/font`.
- `lib/dice-physics.ts`: cannon-es throws within a 1.7 s physics budget, a nudge for dice stuck on an edge, and a 0.2 s settle to the nearest flat face. Each die is then turned so the face it was given is up. Throws use random faces, as in the game, where they come from the player's hidden roll. `lib/random.ts` gives seeded throws for tests.
- `lib/sound.ts` (Web Audio, no library) and `hooks/use-sound.ts`: decode once, separate effects and music channels, nothing before the first tap. `lib/settings-store.ts` and `hooks/use-settings.ts`: Music, Sounds, calm motion and theme, kept in the browser, with warnings when storage is blocked.
- Shared components:
  - `ActionButton` takes an `icon` and a `sound` (tap by default; knock for a bid, talking drum for Call bluff, shekere for chips).
  - `ToastTile` takes an `icon`.
  - `RaisedCard`, `PatternBand` and `PatternFrame`, `DieFace`, `TumblingDie` and `GameIcon`.
- `features/table`:
  - `BoardScene`, a React Three Fiber canvas loaded only in the browser, with carved calabash textures and the centre pot;
  - `BoardPreview`;
  - `seat-layout`, with you always at the bottom.
- `features/design` and the `(prototype)/design` route, marked `noindex`.
- Assets in `apps/web/public`: 12 icons from 3dicons, and 8 sounds (Kenney's casino pack, and talking drum, shekere, djembe and agogo recordings from Wikimedia Commons), all listed in `public/CREDITS.md` with their licences.
- `next.config.ts`: `agentRules: false`, because Next 16 writes its own `AGENTS.md` and the repository already has one.
- Packages:
  - `motion`, `three`, `@react-three/fiber`, `@react-three/drei` and `cannon-es`, plus `@types/three` (dev): used by the design pass, so added in PR 0, not PR 5 as the plan had them.
  - The shadcn `button`, with `class-variance-authority`, `radix-ui` and `cn`.
- Docs:
  - The standards now give every bid a short toast, and tell the accused player when their bluff is called.
  - The plan names the player in "Call bluff on Sly Fox".
  - The look ADR records the fonts and the centre pot.
  - `cn` comes from the `cn` package.
  - The architecture lists the temporary `design` feature.

## Removed

- Nothing in the app. The `design` feature and the `/design` route are removed once real screens use these pieces.

## Verification

- Tests:
  - 600 seeded throws all land flat on the requested face, within 2 s;
  - seat layout for 2, 3 and 4 players;
  - settings, including blocked storage;
  - the sound board: first tap, mute per channel, music loops, a failed load.
- Reviewed by the owner in the running app.
