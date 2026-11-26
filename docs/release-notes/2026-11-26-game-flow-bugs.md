---
date: 2026-11-26
branch: fix/game-flow-bugs
base: dev
scenario-impact: none
---

# Four game-flow fixes from the full check

1. **The host was stuck on "Starting".**
   - **Scenario:** a guest at a paid table fails the payment check, so the contract removes them and reopens the table.
   - **Bug:** the waiting room's "start sent" flag never cleared, so Start kept spinning and Remove, Close, Ready and Copy invite stayed disabled until a reload.
   - **Fix:** the flag now clears as soon as the table leaves Waiting.
2. **Leave failed for a knocked-out player.**
   - **Scenario:** losing your last die removes your link to the table, so `leaveTable` reverts with "You are not sitting at this table."
   - **Fix:** a player who is out now gets "Back to the lobby", as a watcher does.
3. **Play again ignored the computer.**
   - **Bug:** after a free game against the computer, Play again made a new table but never called the computer, so the player sat alone.
   - **Fix:** it now calls the computer to the new table, the same way the lobby's "Play the computer" does.
4. **The tip outlived the game screen.**
   - **Bug:** the bid tip and its "Try safer" button stayed up for up to 10 seconds after leaving mid-turn.
   - **Fix:** it now clears when the game screen goes away.

**No contract change, no new package.**

## Verification

Vitest, red before green, for each of the four:

- starting clears after the table goes from verifying back to waiting;
- a knocked-out player sees Back to the lobby and no Leave;
- the computer is called back after a computer game, and not after a human game;
- the tip is dismissed on unmount.

All web tests pass.
