---
date: 2026-11-25
branch: docs/bot-env-example
base: dev
scenario-impact: none
---

# A settings example for the computer player

On 2026-11-24 the maintainer's dev server crashed on the sign-in page: `NEXT_PUBLIC_BOT_URL`, added in #66, had never reached their own `apps/web/.env.local`, while CI sets it itself. That was fixed locally. This change closes the gap that remained: the computer player had no settings example at all. **No code change, no contract change, no new package.**

## Changes

- **`apps/bot/.env.example`** lists the five settings by name only: `BOT_MNEMONIC`, `SEPOLIA_RPC_URL`, `ALLOWED_ORIGINS`, `BOT_MAX_PLAYERS` and `PORT`.
- **`src/env-example.test.ts`** fails if the example and the names `config.ts` reads ever differ, or if the example ever holds a value.
- **`CONTRIBUTING.md`** says where each package's local settings go, and that a change adding a setting adds it to the example and names it in the pull request. The architecture doc points at the example.

## Verification

- **Vitest:** red first (no example), then green. All bot tests pass.
- **`pnpm preflight`** passed.
