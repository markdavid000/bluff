---
date: 2026-11-26
branch: fix/smooth-dropdowns
base: dev
scenario-impact: none
---

# Menus and folding panels open smoothly

The maintainer noticed that the settings and music menus, and the "Rounds so far" panel, appeared instantly with no transition.

- **Menus** (settings and music, the shared `DropdownMenuContent`):
  - Before: a 150 ms fade with a 5% zoom, too faint to notice.
  - Now: a 200 ms fade and grow from 90%, and the same in reverse on close.
- **Folding panels:** a new `smooth-details` style slides the content open and shut over 250 ms, with a fade. It covers the game's "Rounds so far" panel and the "How we know" sections on the Why it's fair page. Before, they used the browser's built-in fold, which snaps.
- **Calm motion and the device's reduce-motion setting:** menus only fade, and panels open instantly.
- **Older browsers** without `::details-content` still open the panels instantly, as before.

**No contract change, no new package.**

## Verification

- **Vitest:** red first for the menu animation classes and the `smooth-details` class on both panels.
- **Measured in Chrome:**
  - a "How we know" panel grows 24 → 36 → 69 → 88 → 112 → 124 → 136 px over about 250 ms, and shrinks the same way;
  - the settings menu's opacity rises 0.26 → 0.57 → 0.83 → 0.99 over 200 ms.
