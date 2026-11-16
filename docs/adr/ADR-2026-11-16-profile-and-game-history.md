# ADR-2026-11-16: Profile and game history

- **Status:** Proposed
- **Approved by:** (name, date; filled in by the maintainer)
- **Companion:** [ADR-2026-11-16-profile-and-game-history-for-dummies.md](ADR-2026-11-16-profile-and-game-history-for-dummies.md)

## Context

The maintainer asked for two things:

1. **A profile.** Pressing your name in the header should let you change your nickname and your face, and still sign out.
2. **Game history.** A list of every game you played, won or lost. Pressing one opens its details: how many players, whether you won, and so on.

What exists today:

- **The header button** opens a dialog with your face, your name and **Sign out** only. Nicknames and faces can only be set on `/welcome`, which players skip once they have a nickname.
- **`ChipFaucet` 1.2.0** already supports `setNickname` (unique, ignoring letter case) and `setAvatar` (12 preset faces). The web app has the taken-name check (`useNicknameTaken`). Uploading your own picture is PR 9.
- **`Bluff` 1.3.0** keeps every finished table: `getTable(id)` returns its buy-in, seat count, rounds played, start time and every seat with its final dice and whether it was still in. Nothing records which tables a player sat at, and the reason a game ended is only in the `GameEnded` event.
- **Events can't be the source.** Finding a player's games from `PlayerJoined` events means searching logs back to deployment. Today that fails: the app's free Alchemy plan allows 10-block searches, and publicnode has pruned history older than a few days. The nickname rollout hit exactly this.
- **`Bluff` is near the size limit:** 23,632 bytes of the 24,576 allowed.

## Options considered

### Option A: read history from events

- **Gives:** no contract change.
- **Costs:** it doesn't work on the providers we have (see above), and it would get slower with every game. A paid archive RPC or an indexing service (The Graph, Ponder) would make it work, but adds a service to run and pay for, 4 weeks before the deadline.

### Option B: `Bluff` records each player's games (chosen)

- **What:** when a game starts, `Bluff` appends the table id to the player's list. When it ends, it stores the end reason.
- **Measured:** the change brings `Bluff` to 24,381 bytes, leaving 195 bytes spare.
- **Gives:** one paged read for the list, and `getTable` for each game's details.

### Option C: a separate `BluffHistory` contract that `Bluff` writes to

- **Gives:** more room left in `Bluff`.
- **Costs:** a new proxy to deploy, link, own and upgrade, and an external call at every game start and end.

## Decision

Option B, plus a profile dialog and a history page in the web app.

**Contract (`Bluff` 1.4.0):**

- Append to `BluffStorage`:
  - `mapping(address player => uint256[] tableIds) gamesOf;`
  - `mapping(uint256 tableId => uint8 reason) endReasons;` where 0 means not ended and `reason + 1` otherwise.
- **At game start:** `_beginPlay` pushes the table id for every seated player, inside the loop that already deals their dice.
- **At game end:** `_endGame` stores the end reason.
- **New views:**
  - `gamesOf(player, start, count) returns (uint256[] ids, uint256 total)`, newest first;
  - `endReasonOf(id)`.
- **Older games:** games that started before the upgrade aren't listed. There's no room in `Bluff` for a backfill function, and the event search it needs fails on our providers. On the test network that's a few dozen test games. The history page says "Games from 2026-11-xx onward".
- **Size budget:** the 195 spare bytes must cover the pending ready-mark fix, which is a few dozen bytes. Any later `Bluff` change that doesn't fit moves to Option C.

**Web:**

- **Profile dialog** (the header button):
  - your face, with **Change face**: the 12 presets now, and your own picture when PR 9 lands;
  - your nickname, with **Change name**: the same rules, the 400 ms taken-name check and the same toast as the welcome screen;
  - **Your games**;
  - **Sign out**.
  - Each change is its own action with the shared status model. Changes are free, as on the welcome screen.
- **`/history` page, a list newest first, 20 at a time with Load more:**
  - date, your result (Won, Lost, Left early, Draw on time), the number of players, free or the buy-in, and chips won or lost on paid tables.
  - Each row opens the details: every player's face and name, dice left at the end, who won and why (last player standing, most dice when the clock ran out, or a stuck reveal refunded), the number of rounds, when it started, and the pot and each winner's share. Results come from `getTable` plus `endReasonOf`, using the same winner rule as the contract.
- **States:** loading, empty ("No games yet. Play one!" with Play now), failed with Try again, and the end of the list.

**Build order:** a new PR 10, "Profile and game history", after 5B-2 and before PR 8.

## Diagram

```
 header button ─► Profile dialog ─┬─ Change name ─► ChipFaucet.setNickname (unique)
                                  ├─ Change face ─► ChipFaucet.setAvatar
                                  ├─ Your games  ─► /history
                                  └─ Sign out

 game starts ─► Bluff._beginPlay ─► gamesOf[player].push(id)   (every seat)
 game ends   ─► Bluff._endGame   ─► endReasons[id] = reason + 1

 /history ─► Bluff.gamesOf(me, start, 20) ─► ids
           └► for each id: getTable(id) + endReasonOf(id) + profiles ─► list row
              press a row ─► details (players, dice left, winners and why, rounds, pot)
```

## Consequences

- **Better:** players can fix their name and face at any time, and look back at every game they play from now on.
- **Costs more:** about 22,000 gas per player at game start for the first write to their list (sponsored), and one storage write at game end.
- **Size:** `Bluff` is left with 195 bytes spare, so the next contract change that doesn't fit goes into a separate contract.
- **Older games:** games before the upgrade aren't listed.
- **Upgrade:** `Bluff` goes to 1.4.0 on Sepolia through the upgrade task, after the maintainer's explicit approval at the time.
- **Interface:** `gamesOf` and `endReasonOf` are added to `IBluff`. No new events, since `GameEnded` already covers the change.
- **Packages:** none.
- **Confidentiality:** not affected. The ids, seats, final dice and end reason of a finished game are already public; no encrypted value is read or exposed.

## Verification

- **Hardhat:**
  - a game appears in every seated player's list once, newest first, with paging and totals;
  - a cancelled or never-started table doesn't appear;
  - `endReasonOf` for each end reason, and 0 before the end;
  - the size stays under the limit;
  - `validate-layout` passes.
- **Vitest:**
  - the profile dialog: change name (taken, invalid, saved), change face, sign out;
  - `/history`: loading, empty, failed, paging;
  - the result and winner rule for each end reason, and chips won or lost.
- **Sepolia, after the approved upgrade:** play a free and a paid game with both test accounts. Both histories show them with the right results, and both players' renames and face changes show at the table.
