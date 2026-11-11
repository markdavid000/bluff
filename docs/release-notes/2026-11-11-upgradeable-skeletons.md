---
date: 2026-11-11
branch: feat/upgradeable-skeletons
base: dev
scenario-impact: none
---

# Upgradeable contract skeletons, deploy and upgrade tasks

`Bluff` and `ChipFaucet` now exist as upgradeable proxies with an owner, a pause switch and a version, ready for the game logic in the next steps. Deploying and upgrading go through two Hardhat tasks that record addresses and refuse unsafe upgrades.

## Changes

- `Bluff` and `ChipFaucet`: UUPS, `Ownable2Step`, pausable, ERC-7201 storage, `_disableInitializers` in the constructor, `version()` 1.0.0. `Bluff.initialize` sets the Zama coprocessor config for the proxy.
- `IBluff`, `IChipFaucet`, `IMintableERC20`.
- Mocks: `MockUSDT`, `MockConfidentialUSDT` (an `ERC7984ERC20Wrapper`), and V2 mocks with a `reinitializer(2)` for upgrade tests.
- `deploy` and `upgrade` tasks, `config/networks.ts` with Zama's Sepolia cUSDT and mock USDT, and `deployments/<network>.json` records.
- Tests: `admin.test.ts`, `upgrade.test.ts`, `tasks.test.ts` (31 tests in all).
- Slither now compiles from source through `scripts/slither.sh`, because the FHEVM plugin compiles a patched `ZamaConfig.sol` that Slither cannot match against `node_modules`.
- The local Hardhat network uses the standard test accounts; the deployer phrase is only read for Sepolia.
- `knip.json` becomes `knip.ts` with a compiler that reads Solidity imports, so packages used only by contracts are checked like any other.

## Removed

- `knip.json`, replaced by `knip.ts`.
- `hardhat-deploy`, its import and `namedAccounts`, replaced by the deploy and upgrade tasks.
- The `no-inline-assembly` and `max-line-length` solhint rules: the first conflicts with the ERC-7201 accessor, the second with Prettier, which owns line length.

## Verification

- 31 contract tests pass; Slither reports nothing of medium severity or higher (informational only: the storage accessor's assembly, and unindexed events inside OpenZeppelin).
- `pnpm preflight` passes.
