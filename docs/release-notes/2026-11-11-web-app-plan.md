---
date: 2026-11-11
branch: docs/web-app-plan
base: dev
scenario-impact: none
---

# The plan for the website players use

The web app is planned and approved: how it reads the game, how it looks and sounds, and a computer opponent for players on their own.

## Changes

- ADR pairs, approved:
  - [The web app](../adr/ADR-2026-11-11-web-app.md): routes, a keyed RPC with fallback and block-pinned reads, staggered keeper moves, contract exports, nicknames with a tag, winnings and cash out.
  - [Look, feel and sound](../adr/ADR-2026-11-11-look-feel-and-sound.md): the Ludo-style 3D board, tumbling dice, cowries, raised tiles, the journey and the bid picker, dialogs, the profile page, avatars (a `ChipFaucet` 1.1.0 upgrade), music and effects, and where every library and asset comes from, all free.
  - [The computer player](../adr/ADR-2026-11-11-computer-player.md): Baba Dice, a real onchain player on Railway, and Quick game.
- [The plan](../plans/2026-11-11-web-app-plan.md): files, interfaces, state, wording, tests, screens, and ten pull requests from the design pass to the playtests.
- `how-to-play.md`: practice chips are 100 a day, with no balance rule, matching the contract.
- The Privy ADR: server secrets stay in Vercel.

## Removed

- The "fewer than 10 chips" rule from `how-to-play.md`.

## Verification

- Documentation only. Format and comment checks pass.
