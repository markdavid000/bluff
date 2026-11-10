# How the Bluff project is set up, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-10-project-foundation.md](ADR-2026-11-10-project-foundation.md)

## What is the problem?

Bluff has two halves: the game rules that run on the blockchain, and the website people play on. We need to decide where each half lives, which tools build them, and what checks keep the code clean, with about five weeks to the competition deadline.

## What are we doing about it?

Both halves live in one project folder, side by side, so a change to a rule and the screen that shows it happen together. The website uses the same tools and structure as the New Markets project. The game rules use the toolkit Zama provides, because it lets us test hidden dice on a laptop before going live. Every change is checked automatically for formatting, tidiness, leftover comments, technical words on screen, and whether it still builds and passes its tests.

## What changes for people?

Developers get one place to work and one set of rules. Judges reviewing the code see a consistent, well-organised project. The automatic checks take a few minutes per change; we skipped the slowest one (a page-speed audit) to stay fast.

## What could go wrong?

Zama's toolkit only works with an older version of one tool, so we cannot use the newest version yet. We pinned everything to versions known to work together and will upgrade them together once Zama does.
