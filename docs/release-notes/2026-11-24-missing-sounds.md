---
date: 2026-11-24
branch: feat/missing-sounds
base: dev
scenario-impact: none
---

# The last four game sounds

The [web app plan](../plans/2026-11-11-web-app-plan.md) named ten effects, under the approved [look, feel and sound ADR](../adr/ADR-2026-11-11-look-feel-and-sound.md). Six shipped; this adds the other four. **No contract change, no new package.** The maintainer approved downloading them.

## Changes

| Sound         | When                                                            | From (all CC0, by Kenney)        |
| ------------- | --------------------------------------------------------------- | -------------------------------- |
| `settle`      | your thrown dice stop rolling                                   | Casino Audio, "die-throw-4"      |
| `thud`        | a die is lost and tumbles off a player's row                    | Interface Sounds, "drop_002"     |
| `tick`        | once a second through the last ten seconds of **your own** turn | Interface Sounds, "tick_004"     |
| `celebration` | the results card opens and you won                              | Music Jingles, "jingles_STEEL03" |

- They're mono MP3s at 80 kbps like the other effects, 24 KB together, and credited in `public/CREDITS.md`.
- `useSoundOn(name, moment)` plays a sound once each time `moment` changes to a new value, and never twice for the same one. The tick, thud and celebration go through it.
- The waiting room and the landing demo stay silent, as before.
- They follow the effects switch in Settings, like every other effect.

## Not added

The plan's "one tick per face" during the reveal. With up to six players' dice turning over, it would be a long run of ticks over the roll sound.

## Verification

- **Vitest:** red first (five failing tests across the four sounds and the new hook), green after. A test checks that every sound in `config/sounds.ts` has its file in `public/audio`. All web tests pass.
- **The production build serves all four files** as `audio/mpeg`.
- **Not yet heard in a game:** the maintainer signs off on how they sound.
