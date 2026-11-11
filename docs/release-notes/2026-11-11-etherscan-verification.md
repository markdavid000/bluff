---
date: 2026-11-11
branch: fix/etherscan-verify
base: dev
scenario-impact: none
---

# The contracts are readable on Etherscan

All three Sepolia contracts, and the proxies in front of them, are verified on Etherscan. Anyone can read the source, and use "Read as Proxy" and "Write as Proxy" on the addresses players use.

## Changes

- `hardhat.config.ts` passes the Etherscan key as a single string, the format Etherscan's current API expects.
- `tasks/verify.ts` holds the one verification helper, shared by the deploy and upgrade tasks. It names the contract (`contracts/<Name>.sol:<Name>`), because with `bytecodeHash: "none"` the verifier cannot pick the contract from the bytecode alone.
- `docs/contracts.md` lists the verified proxies and implementations with Etherscan links.

## Removed

- The separate verification code in `tasks/deploy.ts` and `tasks/upgrade.ts`, replaced by `tasks/verify.ts`.

## Verification

- The deployed implementations match the local build byte for byte, apart from the three slots holding the implementation's own address, which are set at deployment.
- Etherscan reports each implementation verified, and each proxy linked to its implementation.
- 169 unit tests, typecheck, lint, knip, comments and format pass.
