# If you have a seat, the app takes you to it

- **Status:** Approved
- **Companion:** [ADR-2026-11-17-back-to-your-game.md](ADR-2026-11-17-back-to-your-game.md)

## The problem

If you're sitting at a table and wander off, say to the lobby, your list of past games, or a friend's table link, the game carries on without you. Turns last 60 seconds, so you can lose dice without noticing.

## What we'll do

While you have a seat, whichever page of the game you open, the app takes you straight back to your table. You'll see the usual "Getting your seat ready…" for a moment, never a flash of the page you were heading to.

You leave a table the normal way, with **Leave the table**. After that, the app lets you go anywhere again and won't pull you back.

## What changes for players

- **The lobby's "Back to your table" card goes away,** since you'll never see the lobby while seated.
- **"Your games" can't be opened while you're seated** at a table; you'll be taken back to your table. You can look at your games once you've left or the game is over.
- **The public home page and the sign-in page don't change.**

## How we'll know it works

Tests check each page sends a seated player to their table, and that leaving a table never bounces you back. Then we try it with two accounts: open each page while seated, then leave and check you stay in the lobby.
