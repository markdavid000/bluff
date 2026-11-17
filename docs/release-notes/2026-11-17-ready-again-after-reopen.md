---
date: 2026-11-17
branch: fix/ready-reset
base: dev
scenario-impact: needs_automation
---

# Everyone presses Ready again when a paid table reopens

When a paid table goes back to the waiting room, because someone's chips didn't arrive or someone left during the check, every ready mark now clears. The host can start again only once everyone presses Ready for the new group. This builds the approved [ADR-2026-11-17-ready-again-after-reopen](../adr/ADR-2026-11-17-ready-again-after-reopen.md).

## Changes

- **`Bluff` 1.4.0:**
  - `_reopen` deletes each remaining seat's ready mark before the table waits again.
  - `TableReopened` now also means "nobody is ready"; there is no new event and no storage change.
  - Free tables, which never reopen, keep their marks as before.
- **Size margin:** `BLUFF_HEADROOM` drops from 896 to 768 bytes, as approved.
  - `Bluff` is 23,802 bytes, 774 under the 24,576 limit.
  - The upgrade test's `BluffV2Mock` still deploys.
- **App wording:** the reopen notice reads "The table is open again. Press Ready to play."
- **Docs:** `docs/contracts.md` and `docs/architecture.md` are updated.

## Removed

Nothing.

## Verification

- **Hardhat, red then green:**
  - after a missing payment, both remaining marks read false and `startTable` reverts with `NotEveryoneReady` until the other player readies, then the check starts again;
  - the same after a player leaves during the check;
  - a waiting table keeps the marks when someone leaves before the start.
  - All 256 contract tests pass, including the size, upgrade and confidentiality tests.
- **`validate-layout:sepolia`:** a safe upgrade of the live `Bluff` implementation.
- **Vitest:** the reopen notice asks players to press Ready.
- **Live on Sepolia:** waits for the maintainer's approval of the upgrade, after this merges.
