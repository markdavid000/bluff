# Plan: tooling hardening from the audit

- **Decision:** [ADR-2026-11-14-tooling-hardening.md](../adr/ADR-2026-11-14-tooling-hardening.md) (approved)
- **Branch:** `chore/tooling-hardening`, cut from `origin/dev`

## Files to touch

| File                                                      | Change                                                                                                     |
| --------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `packages/contracts/hardhat.config.ts`                    | No default mnemonic; `sepolia` has accounts only when `MNEMONIC` is set.                                   |
| `packages/contracts/tasks/chain.ts`                       | `safeOwner` and `liveOwner`: refuse a live network with no key, or with the public test key.               |
| `packages/contracts/tasks/{deploy,invites,upgrade}.ts`    | Every live task calls `liveOwner` first.                                                                   |
| `apps/web/eslint.config.mjs`                              | The proxy moves from an element with `mode: "file"` to a `boundaries/files` category, same allow-list.     |
| `package.json`, `pnpm-lock.yaml`                          | `engines.node` 24.x; `devEngines.runtime` Node 24, so pnpm runs every script on Node 24.                   |
| `scripts/preflight.sh`, `lefthook.yml`                    | Preflight stops early on another Node major; the pre-push hook runs it through pnpm.                       |
| `CONTRIBUTING.md`, `AGENTS.md`, contracts `tsconfig.json` | Four proxies, the invites scripts, the smoke test, branch protection, the Node setup, no `deploy/` folder. |

## Tests

`tasks.test.ts` covers the owner guard red then green. The boundaries change is proved by adding a feature import to `src/proxy.ts`, seeing it refused, and restoring the file. Preflight must run with zero warnings.

## Removed

The public mnemonic fallback, `mode: "file"`, the `deploy/**/*` tsconfig entry.
