---
name: bluff-engineering-standards
description: Engineering standards for Bluff, the confidential Liar's Dice game. Load before reading, writing, reviewing or deleting any code, contract, comment, config or document in this repository.
---

# Bluff engineering standards

The rules live in the repository, not in this skill, so every agent and every human reads the same text.

Before any change, read these in full:

1. `AGENTS.md`: the directives, the lifecycle and the pre-review audit.
2. `docs/engineering-standards.md`: TypeScript, components, the hook table, custom hooks, contract data, action status and feedback, plain language, Solidity and FHE, testing, comments, cleanup.
3. `docs/architecture.md`: the packages, the layers and the import rules.

Then read the code you will change, its callers and its tests, the Next.js guide for the APIs involved in `apps/web/node_modules/next/dist/docs/`, and docs.zama.org for any FHE or SDK call.

Non-negotiables to keep in view while working:

- No comments anywhere, from anyone.
- You do not approve your own ADR or plan.
- Player-facing text lives in `copy.ts` and uses plain language.
- Every player action goes through the shared action status model.
- Hidden values are readable only by the players who own them; prove it with a test.
- A replaced implementation is deleted in the same change, with its packages.
- No package is added before the code that uses it.
- `pnpm preflight` passes before you call anything done.
