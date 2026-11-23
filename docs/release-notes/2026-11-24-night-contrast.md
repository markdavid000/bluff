---
date: 2026-11-24
branch: fix/night-contrast
base: dev
scenario-impact: none
---

# Readable text in the night theme

Found in the PR 7 audit. The [engineering standards](../engineering-standards.md#accessibility) require WCAG AA contrast (4.5 : 1) in both themes. **No contract change, no new package.**

## Changes

- **Night seat colours are slightly deeper,** so white text on them passes AA, for example on buttons, the Computer badge and the Watching pill:

  | Night colour                | White text before | After |
  | --------------------------- | ----------------- | ----- |
  | red, 0.60 to 0.57 lightness | 4.09              | 4.6   |
  | green, 0.58 to 0.53         | 3.82              | 4.6   |
  | blue, 0.56 to 0.55          | 4.45              | 4.6   |
  | danger, 0.66 to 0.57        | 3.21              | 4.6   |

- **Two text colours, `--seat-green-text` and `--destructive-text`,** for where green or red is the text itself: the counting balance, the create-table problem line, and the reveal card's stamp and match count. Deepening the fills would have made that text harder to read at night (green text on the night card was already 3.87). The night text colours are lighter, at 4.9 or better; the day ones keep today's colours, which already pass.
- **A contrast test** (`app/theme-contrast.server.test.ts`) reads `globals.css` and checks every text and background pair in both themes against AA, so contrast can't slip again. The colour maths lives in `lib/contrast.ts`.

## Not changed

Calm motion still keeps the 3D board, as the maintainer decided on 2026-11-16. The audit's suggestion to switch to the flat board under calm motion was dropped for that reason.

## Verification

- **Vitest:** the contrast test was red first, failing 12 pairs (the four night fills, and both text colours, missing in each theme), and is green after. The maths has its own tests. All web tests pass.
- **Live:** the lobby in the night theme keeps its colours, slightly deeper.
