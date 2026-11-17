# Plan: PR 10, profile and game history

Builds [ADR-2026-11-16-profile-and-game-history](../adr/ADR-2026-11-16-profile-and-game-history.md), approved by the maintainer on 2026-11-16. Ships as two pull requests, each usable on its own:

| PR       | Delivers                                                          | Usable result                               |
| -------- | ----------------------------------------------------------------- | ------------------------------------------- |
| **10-1** | The profile: change name, change face, game tips, sign out        | Players can fix their name and face anytime |
| **10-2** | The `/history` page, read from the event log (no contract change) | Players can look back at every game played  |

10-1 is web only. 10-2 was amended on 2026-11-17: it reads the event log instead of changing the contract.

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

Amended on 2026-11-17 (see the ADR's Amendment): **no contract change.**

**Web:**

- **Config:** `config/chain.ts` adds `logsClient`, a viem public client on `https://sepolia.gateway.tenderly.co`, and `bluffDeployBlock` (12,112,051).
- **`lib/game-log.ts`:** pure functions.
  - `blockSpans(from, to, size)` splits a search into spans.
  - `mergeGames(cached, found)` merges ids without duplicates, newest first.
  - `gameOutcome(table, reason, me)` gives Won, Lost, Left early or Shared the win, the winners, and chips won or lost, using the contract's winner rule (most dice when the clock ran out).
- **`hooks/use-game-history-list.ts`:**
  - reads the player's cache from browser storage (wrapped in try/catch, with a fresh search if it fails);
  - searches `PlayerJoined` with the player as a topic, from `bluffDeployBlock` or the cached block, in 50,000-block spans;
  - saves the ids and the last block;
  - then reads `getTable` for the newest 20 (Load more adds 20), and `GameEnded` for those ids, and drops tables that never started.
- **The page:** route `app/(game)/history/page.tsx`, with `HistoryScreen` from the table feature.
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
- **10-2, Vitest:**
  - `gameOutcome` for every reason and seat;
  - the list's loading, empty, failed and paging states;
  - the details dialog.
- **Live:**
  - change name and face in both accounts and see them at a table;
  - play a free and a paid game and find both, and earlier games, in each player's history with the right results.

## Removed

Nothing. The name field and face grid move to shared pieces instead of being copied.
