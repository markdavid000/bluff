# ADR-2026-11-25: Tell the player how long the computer waits, and let them call it back

- **Status:** Accepted
- **Approved by:** the maintainer, 2026-11-25
- **Companion:** [ADR-2026-11-25-computer-wait-notice-for-dummies.md](ADR-2026-11-25-computer-wait-notice-for-dummies.md)

## Context

[ADR-2026-11-18-computer-player](ADR-2026-11-18-computer-player.md) section 4 gives the computer a **parking limit**. It leaves a waiting table that hasn't started 5 minutes after it sat down (`PARKING_LIMIT_MS` in `apps/bot/src/seat-intent.ts`), so nobody can tie up the 20 computers.

The web app never says so. The waiting room shows the table's own 10-minute "Table closes in" countdown, and when the computer leaves, the player sees the generic "Baba Dice left the table". The only way to get a computer back is to leave and start again.

While testing on 2026-11-25, the maintainer saw computers leave at about 5 minutes and asked whether it was a bug. The service log confirms all three left with `reason: "not-started"`, 5 min 10 s after sitting down. The maintainer chose to keep the 5-minute limit and tell the player (option a), rather than keep computers for the full 10 minutes (option b).

## Options considered

### Option A: tell the player, and offer to call the computer back (chosen)

- **While a computer waits** at a table that hasn't started, the waiting room says it waits about 5 minutes for the game to start.
- **When a computer leaves** a waiting table, the notice says why. The empty seat, and the buttons under the board, offer **Call the computer back**, which makes the same request as Play the computer, for this table.

**Cost:** web only, plus one constant moved so the web and the service share it. The service's rules and the contracts don't change.

### Option B: keep the computer for the full 10 minutes

Rejected by the maintainer. It doubles how long a parked table holds a computer, and still leaves the player without an explanation.

### Option C: a second countdown for the computer

A live "the computer leaves in 3:12" timer. Rejected: the web can only estimate when the computer sat down, and two countdowns side by side, 10 minutes for the table and 5 for the computer, would confuse more than help.

## Decision

**Option A.**

1. **One number, shared.** `PARKING_LIMIT_MS` moves from `apps/bot/src/seat-intent.ts` to `@bluff/game` as `COMPUTER_WAIT_MS`. The service uses it as before, and the web reads the same value for its wording, so the two can't drift.
2. **While it waits:** when a computer is seated at a table that is still waiting, the waiting room shows one quiet line under the status line: "{name} waits about 5 minutes for the game to start." The minutes come from `COMPUTER_WAIT_MS`.
3. **When it leaves:**
   - `noticeFor` gives a `PlayerLeft` by a computer at a waiting table its own sentence: "{name} left because the game didn't start." Watchers and the game in play are unchanged.
   - The waiting room remembers, for this table and this visit, that a computer left. The empty seat shows **Call the computer back** in place of the invite seat, and the same button appears beside Copy invite link.
   - Pressing it calls `callComputer(table.id)`. The existing arrival flow then shows "The computer is joining…", the computer seat, and any refusal. For example, the service's existing "too old" check refuses a table less than a minute from closing, and the player gets the existing plain message.
   - The button is offered only to a seated person at a table that is still waiting, with a free seat, and not while a computer is already on its way.
4. **Text** goes in `features/table/copy.ts`, in plain language. There are no new technical words.

## Diagram

```
 waiting room, computer seated          computer leaves at 5 min (PlayerLeft, computer)
 ┌───────────────────────────┐          ┌──────────────────────────────────────────┐
 │ Everyone is ready. Start  │          │ toast: Baba Dice left because the game   │
 │ Baba Dice waits about     │   ──►    │        didn't start                      │
 │ 5 minutes for the game    │          │ empty seat: [Call the computer back]     │
 │ to start.                 │          │ buttons:    [Call the computer back] …   │
 └───────────────────────────┘          └───────────────┬──────────────────────────┘
                                                        │ callComputer(table.id)
                                                        ▼
                                         existing arrival flow (joining… / refused)
```

## Consequences

- **Better:** the computer's leaving is explained before and when it happens, and the player can get a computer back in one press instead of starting over.
- **Unchanged:** the 5-minute rule, the service's API and seat rules, and the contracts. Watchers see what they did before.
- **Moved:** `PARKING_LIMIT_MS` leaves `apps/bot`; the service imports `COMPUTER_WAIT_MS` from `@bluff/game`.
- **Limit:** "a computer left" is remembered only for the current visit to the table page. After a reload, the empty seat shows the invite seat again, and the player can still use Copy invite link or go back to the lobby.
- **Packages:** none added or removed.

## Verification

- **Vitest:**
  - the wait line shows only while a computer sits at a waiting table;
  - the "left because the game didn't start" notice for a computer, but not for a person;
  - Call the computer back appears after a computer leaves, calls the computer for this table, and is hidden while one is coming or when no seat is free.
- **Bot tests** still pass with the shared constant.
- **`pnpm preflight`.**
- **Live:** sit with the computer without starting, see the wait line, see the notice and the button at about 5 minutes, press it, and see the computer return.
