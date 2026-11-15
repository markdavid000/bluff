# Three game fixes, in plain English

- **Status:** Approved
- **Approved by:** (MarkDavid, 15th Nov 2026)
- **Technical version:** [ADR-2026-11-14-rule-fixes.md](ADR-2026-11-14-rule-fixes.md)

## What is the problem?

A check of the game before the competition found three things to fix:

1. **A lost seat.** If you leave a game early and sit down at a new table, the old game finishing wipes your seat at the new one. You then can't get ready, leave or cancel there, and you could even sit at a second table at the same time. On a paid table your chips could get stuck.
2. **Too few dice.** A table's dice are set by how many seats it has, not by how many people sit down. So two friends who start a 4-seat table early get only 2 dice each, when the guide says 4.
3. **Turns are too short.** 30 seconds isn't enough to think, choose a bid and confirm it.

## What are we doing about it?

1. When a game ends, it only clears the seats of players who are still at that table.
2. Dice are dealt when the game starts, by the number of players actually there: 2 players get 4 each, 3 get 3, 4 get 2.
3. Turns become 60 seconds on screen. The game itself allows 75, so a move that lands a little late still counts.

## What changes for people?

- No one gets stuck at a table they can't leave, or seated at two tables.
- Small games get the right number of dice, so there's more to bluff with.
- Each turn shows a 60-second ring instead of 30. Games can run a little longer, but the 15-minute game clock still ends every game.
- The game is updated in place on the test network; addresses and chips don't change.

## What could go wrong?

The update replaces the live game's code. We first check automatically that the stored data lines up exactly, and the update only happens after you say go. If anything looks off, we stop before updating.
