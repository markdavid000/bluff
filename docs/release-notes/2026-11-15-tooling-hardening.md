---
date: 2026-11-15
branch: chore/tooling-hardening
base: dev
scenario-impact: none
---

# Safer deploys and a preflight with zero warnings

Nothing changes for players. Live deploys and upgrades can no longer fall back to a key everyone knows, and the quality checklist now finishes with zero warnings on the same Node as CI and hosting.

## Changes

- **No public key on live networks:** `hardhat.config.ts` has no default mnemonic, and `deploy`, `deploy-invites`, `link-invites` and `upgrade` refuse to run on a live network without your own `MNEMONIC`, or with the public test key. Read-only tasks such as `validate-layout` still run without a key.
- **Boundaries without the deprecated `mode`:** the proxy is a `boundaries/files` category with the same allow-list (proxy, `lib`, `config`). A feature import into `src/proxy.ts` is still refused.
- **Node 24 everywhere:** `engines.node` is 24.x and `devEngines.runtime` asks pnpm to run every script on Node 24, downloading it if needed, so the build no longer prints Node 26's `localStorage` notice. `pnpm preflight` stops early on another Node major, and the pre-push hook now runs it through pnpm. npm's `npx` honours `devEngines` too and refuses to run inside the repo on another Node, so use `pnpm exec`.
- **Docs:** the contributing guide lists all four proxies and the invites scripts, describes the smoke test and the Node setup correctly, and AGENTS.md says how branches are protected while the repository is private. The contracts `tsconfig.json` no longer includes a `deploy/` folder that doesn't exist.

## Removed

- The public mnemonic fallback, the boundaries `mode: "file"` setting and the `deploy/**/*` tsconfig entry.

## Verification

- `tasks.test.ts`: the owner guard refuses no key and the public key on Sepolia, and accepts your own key and the local test key.
- The proxy boundary refuses a feature import (added, refused, removed).
- `pnpm preflight` passes with zero warnings; run directly on Node 26 it stops with the plain message.
