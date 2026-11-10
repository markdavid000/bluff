# ADR-2026-11-10: Project foundation

- **Status:** Approved
- **Approved by:** (MarkDavid, 10th Nov 2026)
- **Companion:** [ADR-2026-11-10-project-foundation-for-dummies.md](ADR-2026-11-10-project-foundation-for-dummies.md)

## Context

Bluff is an entry for the Zama Developer Program Mainnet Season 5 (confidential gaming), closing 2026-12-14 23:59 AOE. The submission needs a smart contract and a frontend, deployed to Sepolia, with clear documentation. Judging covers gameplay and UX, confidentiality design, fairness, functionality, demo quality and code quality.

The owner wants the codebase to follow the standards of the New Markets frontend (feature-based layers, ADRs, strict gates), with contracts and frontend in one repository, no code comments, and every New Markets CI check except Lighthouse.

## Options considered

### Repository shape

- **Two repositories.** Clean separation, but every rule change spans two pull requests and the ABI can drift from the app.
- **One pnpm workspace with `apps/web` and `packages/contracts`.** One pull request changes a rule end to end; the app reads ABIs and addresses from the contracts package.
- **Turborepo on top of the workspace.** Task caching, but a new tool for two packages; pnpm's recursive runs cover the need.

### Contract toolchain

- **Hardhat 3 or Foundry.** Newer, but the Zama FHEVM Hardhat plugin (`@fhevm/hardhat-plugin` 0.4.2) declares `hardhat ^2` and pins `@fhevm/solidity ^0.11.1` and `@zama-fhe/relayer-sdk 0.4.1`. Without it there is no local FHE mock for tests.
- **Zama's Hardhat template on Hardhat 2.** Supported path, local mock, Sepolia deploy, typechain.

### Hosting

- **Cloudflare Workers via OpenNext**, as New Markets: same build, smoke test and deploy flow.
- **Static hosting.** Simpler, but diverges from New Markets and loses the Worker smoke test.

## Decision

- One pnpm workspace: `apps/web` (`@bluff/web`) and `packages/contracts` (`@bluff/contracts`). No Turborepo.
- Web: Next.js 16.4 App Router, React 19.3 with the React Compiler, TypeScript strict, Tailwind CSS v4, shadcn/ui, Vitest. Layers and lint boundaries copied from New Markets, plus a `components/shared/` layer for reusable composites.
- Contracts: Zama's Hardhat template on Hardhat 2.29, `@fhevm/solidity` 0.11.1 and the matching plugin, mock and relayer versions; Solidity 0.8.27, `cancun`; solhint with custom errors required.
- Hosting: Cloudflare Workers via OpenNext, `bluff` and `bluff-staging`.
- Gates: format, comments, copy, compile, lint, typecheck, tests, knip, Cloudflare build, Worker smoke test, branch flow, gitleaks. No Lighthouse.
- No comments anywhere, checked by `scripts/check-comments.mjs`; only the SPDX licence line and generated files are exempt.
- Player-facing text in `copy.ts`, checked by `scripts/check-copy.mjs` and `react/jsx-no-literals`.

## Diagram

```
bluff/
├── apps/web ─────────── reads ABI + addresses ──────────┐
│     Next.js on Cloudflare Workers                       │
└── packages/contracts ◄──────────────────────────────────┘
      Hardhat 2 + FHEVM plugin ── deploy ──► Sepolia

CI: branch flow │ checks │ tests │ build + smoke │ secrets ──► quality
```

## Consequences

- One pull request can change a rule in the contract, its tests and the screen that shows it.
- Contract tooling stays on Hardhat 2 until Zama's plugin supports a newer major. Dependabot ignores Hardhat majors and Zama packages; they are upgraded together by hand.
- The no-comments rule moves documentation into names, ADRs and `docs/`. NatSpec is not used; contract behaviour is documented in `docs/` and the tests.
- Without Lighthouse, page speed is guarded by review and the performance rules in the standards.
- Packages added now: Next.js, React, Tailwind, Vitest and Testing Library, ESLint with boundaries, OpenNext and Wrangler, Hardhat 2 with the FHEVM plugin and its peers, solhint, Prettier with the Solidity and Tailwind plugins, knip, Lefthook, commitlint.

## Verification

`pnpm preflight` passes on the empty scaffold except for Solidity lint, which needs the first contract file and passes from the game rules change onwards. CI runs the same gates on every pull request.
