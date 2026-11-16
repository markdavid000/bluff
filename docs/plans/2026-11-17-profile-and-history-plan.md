# Plan: PR 10, profile and game history

Builds [ADR-2026-11-16-profile-and-game-history](../adr/ADR-2026-11-16-profile-and-game-history.md), approved by the maintainer on 2026-11-16. Ships as two pull requests, each usable on its own:

| PR       | Delivers                                                       | Usable result                               |
| -------- | -------------------------------------------------------------- | ------------------------------------------- |
| **10-1** | The profile: change name, change face, game tips, sign out     | Players can fix their name and face anytime |
| **10-2** | `Bluff` 1.4.0 records each player's games; the `/history` page | Players can look back at every game played  |

10-1 is web only. 10-2 changes the contract, so its live Sepolia upgrade waits for the maintainer's yes, as always.

## 10-1: The profile

**Where:** the header's name button opens the existing dialog, which becomes the profile.

```
┌──────────── Your profile ────────────┐
│               (face)                 │
│               Favour                 │
│   [ Change name ]  [ Change face ]   │
│   [ Your games ]   [ Game tips ]     │
│   (day/night, sound, music on phones)│
│            [ Sign out ]              │
└──────────────────────────────────────┘
```

- **Change name:** the dialog swaps to the name field. It's the same field and rules as the welcome screen: the taken-name check after a 400 ms pause, the "taken" toast, and Save off while a name is taken. Save sends `setNickname`, through the shared action status, then returns to the profile with the new name.
- **Change face:** the dialog swaps to the same grid of 12 faces as the welcome screen. Pressing one sends `setAvatar` and returns. Uploading your own picture arrives with PR 9.
- **Your games:** opens `/history`. This waits for 10-2; until then the button isn't shown.
- **Game tips:** opens the tips dialog, the same as Settings.
- **Sign out:** as today.
- **Closing:** the dialog can't close while a save is in progress, and a toast says it's still saving, as other dialogs already do (`holdOpenWhile`).
- **Shared pieces:** `NicknameField` and `FacePicker` move out of `welcome-form.tsx` into `features/account/components/`, and both the welcome screen and the profile use them. The welcome screen looks and behaves as before.
- **Hook:** `useProfileEdit` holds which panel is showing and runs the two saves, built on the existing `useWelcome` pieces (`useNicknameTaken`, the `setNickname` and `setAvatar` moves). No duplicate logic.

## 10-2: Game history

**Contract (`Bluff` 1.4.0):**

- Append `mapping(address player => uint256[] tableIds) gamesOf;` and `mapping(uint256 tableId => uint8 reason) endReasons;` to `BluffStorage`.
- `_beginPlay` pushes the id for each seat in the existing dice loop; `_endGame` stores `reason + 1`.
- New views: `gamesOf(player, start, count)`, newest first, returning the total too; and `endReasonOf(id)`.
- Measured at 24,381 bytes, under the 24,576 limit. A test checks the size.
- `version()` becomes 1.4.0. `validate-layout` and the upgrade task run as before.

**Web:**

- Route `app/(game)/history/page.tsx`, from the table feature (`HistoryScreen`).
- **`useGameHistoryList`:**
  - reads `gamesOf(me, start, 20)`, then `getTable` and `endReasonOf` for each id in one multicall, plus names;
  - has Load more;
  - is a plain function `gameOutcome(table, reason, me)`, sharing the contract's winner rule (most dice when the clock ran out), that gives Won, Lost, Left early or a draw, the winners, and chips won or lost.
- **The list:** a card per game, newest first, showing:
  - the date;
  - the result, as a coloured tag;
  - the players' faces;
  - free or the buy-in;
  - chips won or lost.
- **Details:** pressing a game opens a dialog with:
  - every player, with their face, name and dice left;
  - who won and why;
  - the number of rounds and when it started;
  - the pot and each winner's share.
- **States:**
  - loading: placeholder cards;
  - empty: "No games yet. Play one!" with Play now;
  - failed: Try again;
  - the end of the list.
- **The note:** "Games from 1.4.0 onward" under the title, with the date of the upgrade.
- **Profile:** the **Your games** button appears.

## Wording (`copy.ts`)

| Key                                                       | Text                                                                                                   |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------ |
| `yourProfile`                                             | "Your profile"                                                                                         |
| `changeName` / `changeFace`                               | "Change name" / "Change face"                                                                          |
| `saveName` / `savingName`                                 | "Save name" / "Saving your name…"                                                                      |
| `nameSaved` / `faceSaved`                                 | "Name saved." / "Face saved."                                                                          |
| `yourGames`                                               | "Your games"                                                                                           |
| `historyTitle`                                            | "Your games"                                                                                           |
| `noGamesYet`                                              | "No games yet. Play one!"                                                                              |
| `outcome.won` / `lost` / `left` / `draw`                  | "Won" / "Lost" / "Left early" / "Shared the win"                                                       |
| `endedBy.lastStanding` / `clock` / `othersLeft` / `stuck` | "Last player standing" / "Most dice when time ran out" / "Everyone else left" / "Stopped and refunded" |

## Tests

- **10-1, Vitest:**
  - the profile shows each panel;
  - change name: taken, invalid, saved, failed;
  - change face: saved and failed;
  - the dialog stays open while saving;
  - Game tips and Sign out;
  - the welcome screen's tests still pass unchanged after the move to shared pieces.
- **10-2, Hardhat:**
  - a game appears once for every seated player, newest first, with paging and totals;
  - cancelled or unstarted tables don't appear;
  - `endReasonOf` for each reason, and 0 before the end;
  - the size limit;
  - the layout check.
- **10-2, Vitest:**
  - `gameOutcome` for every reason and seat;
  - the list's loading, empty, failed and paging states;
  - the details dialog.
- **Live:**
  - change name and face in both accounts and see them at a table;
  - after the approved upgrade, play a free and a paid game and find both in each player's history with the right results.

## Removed

Nothing. The name field and face grid move to shared pieces instead of being copied.
