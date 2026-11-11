# ADR-2026-11-11: Upgradeable contracts and security model

- **Status:** Approved
- **Approved by:** (MarkDavid, 11th Nov 2026)
- **Companion:** [ADR-2026-11-11-upgradeable-contracts-and-security-for-dummies.md](ADR-2026-11-11-upgradeable-contracts-and-security-for-dummies.md)

## Context

Bluff's contracts will reach Sepolia with five weeks of testing at most. Bugs found after deployment would otherwise mean a new address, lost game state, and a web app pointed elsewhere. The owner wants to fix and upgrade in place.

Facts checked against the installed packages:

- Zama's `ZamaEthereumConfig` sets the coprocessor addresses in its constructor, but stores them in an ERC-7201 namespaced slot (`confidential.storage.config`). Behind a proxy, calling `FHE.setCoprocessor(ZamaConfig.getEthereumCoprocessorConfig())` in `initialize` gives the same result.
- ACL permissions belong to the contract address. A proxy keeps its address across upgrades, so encrypted values stored before an upgrade stay usable after it.
- Zama's own `cUSDTMock` on Sepolia is an ERC-1967 proxy, so this pattern is already used with FHEVM.
- `@openzeppelin/hardhat-upgrades` 3.9.1 supports Hardhat 2 with `hardhat-ethers` 3 and `hardhat-verify` 2. It validates storage layouts before every upgrade, and reads two annotations written as NatSpec tags: `@custom:storage-location` and `@custom:oz-upgrades-unsafe-allow`.

Upgradeability has a cost. Whoever can upgrade can change the rules, and the new code could grant itself access to stored dice. That has to be stated openly in a game whose pitch is "nobody can see your dice".

## Options considered

### Deployment model

- **Immutable contracts.** Maximum trust, but every fix is a redeploy and a data loss.
- **Transparent proxy.** Upgrade logic lives in a separate admin contract; slightly more gas per call.
- **UUPS proxy (ERC-1822 / ERC-1967).** Upgrade logic lives in the implementation and is guarded by `_authorizeUpgrade`; cheapest per call; OpenZeppelin's current recommendation.

### Who can upgrade

- **A single owner key.** Fast fixes during the competition.
- **A timelock.** Players see an upgrade days before it takes effect; too slow for fixing a live bug in five weeks.
- **A single owner key now, with every upgrade public, and a timelock or a freeze after the competition.**

## Decision

**Upgradeability**

- `Bluff` and `ChipFaucet` are **UUPS proxies** built on `@openzeppelin/contracts-upgradeable` 5.7.0.
- **Storage uses ERC-7201 namespaces** (`bluff.storage.Bluff`, `bluff.storage.ChipFaucet`), never plain state variables.
- Each implementation's constructor calls `_disableInitializers()`. `initialize` sets the Zama coprocessor config, the owner and the chip token, and can run once.
- Deploys and upgrades go through `@openzeppelin/hardhat-upgrades` 3.9.1, which refuses an upgrade with an unsafe storage layout. `hardhat-deploy` is removed; deployed addresses are written to `packages/contracts/deployments/<network>.json`.
- Each contract exposes `version()`. Every upgrade bumps it, gets a release note, and is verified on Etherscan.

**Owner powers**, using `Ownable2StepUpgradeable`, so ownership moves only when the new owner accepts:

| Power        | Scope                                                                                                                                                    |
| ------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Upgrade      | Replace the implementation.                                                                                                                              |
| Pause        | Stops new tables, joins and chip claims. Never stops leaving, moves, timeouts, reveals, settlement or payouts, so chips can never be trapped by a pause. |
| Nothing else | The owner cannot move chips, end games, see dice or change a table.                                                                                      |

The "How is this fair?" panel and the README state that the contracts are upgradeable by their makers and that every upgrade is public. After the competition, ownership moves to a timelock or upgrades are frozen; that is its own ADR.

**Security model**

- **Reentrancy:** `ReentrancyGuardTransient` on every function that calls the chip token, plus checks, effects, interactions.
- **Callback authentication:** the chip-token callback accepts calls only from the configured chip token.
- **Bounded work:** at most 4 seats and 9 dice per table; no function loops over tables or players beyond one table.
- **No `tx.origin`:** works with embedded wallets, EIP-7702 sponsorship and smart accounts.
- **Static analysis in CI:** a Slither job fails the `quality` check on findings of medium severity or higher; accepted findings are listed with reasons in `docs/contracts.md`.
- **Coverage gate:** contract line coverage of at least 95% and branch coverage of at least 90%, checked in CI.
- **Upgrade safety in CI:** the storage layout is validated against the last deployed version on every pull request that changes a contract.
- **Comment rule:** the comment checker allows exactly two machine-read annotations alongside the SPDX line, `/// @custom:storage-location erc7201:<id>` and `/// @custom:oz-upgrades-unsafe-allow constructor`. Everything else stays banned.

## Diagram

```
 player ──► ERC1967Proxy (Bluff address, storage, ACL rights)
                 │ delegatecall
                 ▼
            Bluff implementation v1 ──upgradeTo (owner only, validated)──► v2
                 │
                 └─ initialize: FHE.setCoprocessor, owner, chip token (once)
```

## Consequences

- Bugs found after launch are fixed in place; tables, chips and encrypted dice survive.
- Players must trust the owner key until upgrades are timelocked or frozen. This is disclosed, not hidden.
- More moving parts: initializers, namespaced storage, layout validation. The tests and CI carry most of the weight.
- Packages added: `@openzeppelin/contracts-upgradeable` 5.7.0, `@openzeppelin/contracts` 5.7.0, `@openzeppelin/hardhat-upgrades` 3.9.1. Removed: `hardhat-deploy`.
- CI gains a Slither job and a coverage gate; the comment checker gains two allowed annotations.

## Verification

Tests prove that an upgrade keeps tables and that a player can still decrypt dice stored before it; that only the owner can upgrade; that `initialize` cannot run twice or on the implementation; and that pausing blocks only new tables, joins and claims. Slither, coverage and layout validation run in CI.
