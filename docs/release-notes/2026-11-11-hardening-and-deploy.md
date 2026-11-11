---
date: 2026-11-11
branch: feat/hardening-and-deploy
base: dev
scenario-impact: none
---

# The game is live on Sepolia

Bluff, BluffCashier and ChipFaucet are deployed on Sepolia behind upgradeable proxies. A free game and a paid game were played start to finish against them. The contracts now have a full reference, and every pull request checks that a change can still upgrade the live contracts safely.

## Changes

- Deployed to Sepolia and recorded in `packages/contracts/deployments/sepolia.json` (proxies, implementations, versions) and `packages/contracts/.openzeppelin/sepolia.json` (the storage layouts upgrades are checked against).
- `docs/contracts.md`: every external function, event and error; who can read each encrypted value; limits; owner powers; the upgrade runbook; accepted Slither findings; measured Sepolia timings.
- Hardening tests:
  - `confidentiality.test.ts` proves the owner, other players and outsiders cannot read dice, payments, pots, balances or payouts that are not theirs.
  - `limits.test.ts` proves the FHEVM mock enforces Zama's per-transaction HCU limits. With `HcuBurnerMock`, both the depth and total limits trip, so every other test runs within budget.
  - `invariants.test.ts` plays eight seeded random games and checks seats, dice and status after every move.
- `test/sepolia/full-game.ts` (`pnpm --filter @bluff/contracts test:sepolia`) plays a free round and a paid game on Sepolia with two accounts and prints each step's time. Every read is pinned to the last mined block, and each move waits for the node to reach it, because the public RPC can answer from an older block.
- `validate-layout` task (`validate-layout:sepolia`) and a new `upgrade safety` CI job, required by `quality`. Together they check the current source is a safe upgrade of each deployed proxy.
- The deploy task waits for 2 confirmations on live networks, retries reading the implementation address, and skips Etherscan verification when no key is set. The upgrade task does the same.
- `pnpm test` runs only `test/unit`; the Sepolia suite runs on demand.

## Removed

- Nothing.

## Verification

- 169 unit tests pass; coverage 100% lines, 95.49% branches; Slither reports no medium or higher finding.
- `validate-layout:sepolia` passes for all three proxies.
- `test:sepolia` passed both games on Sepolia. Measured times, in seconds: create 6, join and roll 13, read own dice 4, bid 5–11, call 13, public reveal 5–8, settle 14–16, pay and join 22–23, payment check 5 + 6, leave and pay out 11–12.
- No web app change, so nothing to click yet.
