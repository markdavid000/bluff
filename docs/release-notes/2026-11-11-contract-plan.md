---
date: 2026-11-11
branch: docs/contract-plan
base: dev
scenario-impact: none
---

# Contract plan and the chips decision

The plan for Bluff's contracts and a proposed decision on how chips and buy-ins work. No code changes.

## Changes

- ADR pair: chips and buy-ins (Zama's test cUSDT with a one-move faucet, one-move pay-and-join, paid seats checked before the first roll, a daily claim).
- ADR pair: upgradeable contracts and security model (UUPS proxies, limited owner powers, Slither, coverage and layout checks in CI).
- `docs/plans/2026-11-11-game-contracts-plan.md`: contract structure, storage, interfaces, encrypted values, a security review, scalability, tests and build order.

## Removed

- Nothing.

## Verification

- Documentation only; formatting and the repository checks pass.
