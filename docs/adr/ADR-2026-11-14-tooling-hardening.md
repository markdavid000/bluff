# ADR-2026-11-14: Tooling hardening from the audit

- **Status:** Approved
- **Approved by:** (MarkDavid, 15th Nov 2026)
- **Companion:** [ADR-2026-11-14-tooling-hardening-for-dummies.md](ADR-2026-11-14-tooling-hardening-for-dummies.md)

## Context

A setup audit before submission found three tooling problems and a set of stale docs. None of them change how the game plays.

### 1. Sepolia deploys fall back to a public key

`packages/contracts/hardhat.config.ts` reads `MNEMONIC` with a default of the well-known "test test … junk" phrase, and the `sepolia` network uses it. `tasks/deploy.ts` makes the first signer the owner of every UUPS proxy without checking who it is. If `deploy:sepolia`, `deploy-invites:sepolia` or `upgrade:sepolia` ever ran on a machine without the variable set, the owner would be an address whose key everyone knows (0xf39F…), and anyone could upgrade the proxies. Today's deployments are safe: the deployer in `deployments/sepolia.json` is the maintainer's own key.

### 2. Preflight prints warnings

The rule is zero warnings, but a clean preflight prints two:

- **ESLint:** `eslint-plugin-boundaries` 7 says the `mode` option in element descriptors is deprecated. We use `mode: "file"` once, to make `src/proxy.ts` its own element. Simply removing it leaves the proxy unclassified (`boundaries/no-unknown-files` fails), so it needs the v7 way of describing single files.
- **Build:** Node prints `ExperimentalWarning: localStorage is not available because --localstorage-file was not provided` while generating static pages. It comes from Node 25 and later, which add a built-in `localStorage`. The repo pins Node 24 (`.nvmrc`, and CI reads it), but `engines` only says `>=24`, so a newer local Node runs without complaint and prints the warning.

### 3. Docs are stale

`CONTRIBUTING.md` and `tasks/upgrade.ts` list three upgradeable contracts (BluffInvites is missing) and "both proxies" where there are four. The package-scripts table omits `deploy-invites:sepolia` and `link-invites:sepolia`. A `packages/contracts/deploy/` folder is described that doesn't exist (and `tsconfig.json` still includes it). The smoke test is described as "a 200 on every route", but it also checks the sign-in redirects. AGENTS.md says branch protection enforces the branch rules, while CONTRIBUTING.md correctly says the private free-plan repo can't, and the local lefthook guard stands in.

## Options considered

### Deploy key: no fallback, plus a guard

Give the `sepolia` network accounts only when `MNEMONIC` is set (otherwise none), and make the deploy, invites-deploy and upgrade tasks refuse to run without a signer or when the signer is the public test address. Read-only tasks such as `validate-layout` keep working without a key.

### Deploy key: keep the fallback, document it

Rejected: a documented trap is still a trap.

### Boundaries: migrate to the v7 descriptors

Follow the plugin's v6-to-v7 migration guide for the proxy entry, keeping the same rules: the proxy may import only `lib` and `config`. Prove it with a lint check that an import from a feature into the proxy is still refused.

### Node: match `.nvmrc` everywhere

Set `engines.node` to `24.x` with pnpm's engine check on, and make `preflight` fail early with a plain message when the running Node major doesn't match `.nvmrc`. Rejected alternative: passing `--no-experimental-webstorage` in the build script, which hides the symptom on one machine instead of running the version CI and hosting use.

## Decision

1. `hardhat.config.ts`: no default mnemonic; `sepolia` gets accounts only when `MNEMONIC` is set. `deploy`, `deploy-invites`, `link-invites` and `upgrade` refuse to run without a signer, or with the public test address, with a plain error.
2. Migrate the `boundaries` config to v7 descriptors for the proxy, with the same allow-list, and no deprecation notice.
3. `engines.node: "24.x"` and a Node-version check at the start of `scripts/preflight.sh`.
4. Correct the stale docs listed above, including AGENTS.md's branch-protection sentence and the stray `deploy/**/*` in the contracts `tsconfig.json`.

## Diagram

```
pnpm preflight
  ├─ node major == .nvmrc ? ── no ──► stop: "Use Node 24 (see .nvmrc)"
  └─ yes ─► format · comments · copy · compile · lint (no notices) · … · build (no warnings)

hardhat --network sepolia <deploy | upgrade …>
  ├─ MNEMONIC set ? ── no ──► stop: "Set your own MNEMONIC first"
  ├─ signer == public test address ? ── yes ──► stop
  └─ run
```

## Consequences

- No deploy or upgrade can ever make a public key the owner.
- Preflight runs with zero warnings, as the rules require, and on the same Node as CI and hosting.
- Contributors on Node 25 or later must switch to 24 (`nvm use`). That's one command.
- No contract, game or UI change, no new packages, no storage change.

## Verification

- `pnpm --filter @bluff/contracts exec hardhat --network sepolia deploy` without `MNEMONIC` stops with the plain message, without sending anything. `validate-layout` still runs.
- `pnpm lint` prints no boundaries notice, and a temporary feature import in `src/proxy.ts` is still refused.
- `pnpm preflight` on Node 24 passes with zero warnings; on another Node major it stops at the first step with the plain message.
- The docs match the commands, contracts and checks that exist.
