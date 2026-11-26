---
date: 2026-11-26
branch: fix/phone-buttons
base: dev
scenario-impact: none
---

# Slimmer buttons on phones

The maintainer asked for shorter, narrower buttons on phones. On screens narrower than 40rem (about 640 px), every shared button size now steps down. This covers every `ActionButton` and `TileLink`, such as Start, Leave, Raise, Call bluff and Join.

| Size   | Wider screens         | Phones                |
| ------ | --------------------- | --------------------- |
| large  | 64 px tall, text-2xl  | 48 px tall, text-xl   |
| medium | 48 px tall, text-lg   | 40 px tall, text-base |
| small  | 40 px tall, text-base | 36 px tall, text-sm   |

- **Other changes on phones:**
  - the side padding and the pressed-in depth get smaller;
  - icons scale with the text;
  - Raise and Call bluff need at least 112 px of width, down from 144 px.
- **Removed:** the waiting room's phone-only button overrides from #96, which this replaces.
- **Wider screens** are unchanged.
- **Side effect:** your own turn gets more room for the board on small phones, 69 → 129 px wide at 328 × 720.

**No contract change, no new package.**

## Verification

- **Vitest:** red first for the phone size at each of the three sizes.
- **Rendered at 328, 360 and 390 px wide:** Raise, Call bluff and Leave are 36 px tall, and nothing runs off the screen.
