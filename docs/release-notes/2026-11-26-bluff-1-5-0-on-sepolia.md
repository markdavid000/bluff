---
date: 2026-11-26
branch: chore/upgrade-bluff-1-5-0
base: dev
scenario-impact: none
---

# Bluff 1.5.0 is live on Sepolia

The maintainer upgraded `Bluff` from 1.4.0 to 1.5.0 (#92) with `pnpm --filter @bluff/contracts upgrade:sepolia --contract Bluff`.

- **Proxy, unchanged:** `0x46B6D765E3F12cB72F6d50f86ea57C436D4AE23e`.
- **New implementation:** `0x4D3B8FfF05dbF258AE7Ab011289916BFc486BFAB`, verified on Etherscan.
- **Confirmed on-chain:** `version()` returns 1.5.0, and the proxy's implementation slot points at the new code.
- **Records:**
  - `deployments/sepolia.json` and the `.openzeppelin/` manifest, which the next upgrade is checked against;
  - `docs/contracts.md`'s Sepolia table.
