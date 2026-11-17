---
date: 2026-11-17
branch: fix/reopen-host-wording
base: dev
scenario-impact: none
---

# The host isn't asked to press Ready

When a paid table reopens, the host now sees "The table is open again." Everyone else still sees "The table is open again. Press Ready to play." Hosts never need to be ready, so the old message asked the host for something they can't do. The live check of `Bluff` 1.4.0 showed it to a player who had just become host and was alone at the table.

## Changes

- **`noticeFor`** takes the table's host and picks the host's wording for `TableReopened`.
- **`useTableEvents`** takes the table's `host`. If a `HostChanged` arrives in the same batch before the reopen, it uses the new host. The waiting room and the game pass in `table.host`.
- **Copy:** `openAgainForHost`.

## Removed

Nothing.

## Verification

- **Vitest, red then green:**
  - the host's wording has no "Ready";
  - other players keep "Press Ready to play";
  - a player made host in the same batch as the reopen gets the host's wording.
- **Live:** on table 229776856225801, Mark became host as the table reopened and saw "Press Ready to play". This fixes that case.
