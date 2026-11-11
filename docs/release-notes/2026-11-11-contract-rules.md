---
date: 2026-11-11
branch: feat/contract-rules
base: dev
scenario-impact: none
---

# Contract rules and contract quality gates

The first Solidity code: the pure rules every later contract builds on, with full tests, plus the security and coverage checks every contract change now has to pass.

## Changes

- `TableRules`: seat counts, dice per seat count (4, 3, 2), buy-in options, and every time limit.
- `BidRules`: valid faces and quantities, bid ordering, the highest possible bid, mapping stored values to faces, and counting matching dice with ones wild.
- `NicknameRules`: 3 to 20 letters, digits, single spaces, `_` and `-`.
- `RulesHarness` in `contracts/mocks/` exposes the libraries to tests; `test/unit/rules.test.ts` covers every rule.
- CI runs Slither (fails on medium or higher) and a contract coverage gate (95% lines, 90% branches); `quality` waits for both.
- solhint adds naming, ordering, unused-import and custom-error rules; `gas-strict-inequalities` is off because it trades readability for negligible gas.
- The comment checker allows the two upgrade annotations approved in the upgradeability ADR, and nothing else.

- The plan listed the upgrades plugin in step 1; it arrives in step 2 with the first upgradeable contract, so no package lands before its first user.

## Removed

- The temporary `lint:sol` guard for an empty `contracts/` folder.
- The unknown `custom-errors` solhint rule, replaced by `gas-custom-errors`.

## Verification

- 13 rules tests pass; coverage is 100% of lines and branches.
- Slither 0.11.4 locally: 0 findings across 4 contracts.
- `pnpm preflight` passes.
