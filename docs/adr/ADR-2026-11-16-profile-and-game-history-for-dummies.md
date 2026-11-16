# Your profile and your past games, in plain English

- **Status:** Proposed
- **Technical version:** [ADR-2026-11-16-profile-and-game-history.md](ADR-2026-11-16-profile-and-game-history.md)

## What is the problem?

Once you've picked a name and a face, you can't change them, because the screen for that only shows on your first visit. There's also no way to look back at the games you've played, won or lost.

## What are we doing about it?

- **Your profile:** pressing your name at the top opens your profile. From there you can change your name (it must still be one nobody else has), pick a different face, open your past games, or sign out. Uploading your own picture comes in a later update.
- **Your past games:** a list of every game you've played, newest first: when, whether you won or lost, how many players, and the chips. Press one to see the details: who played, how many dice each had left, who won and why, how many rounds it lasted, and who got what from the pot.

To make the list reliable, the game itself will note down which games each player sits in. Today there's no dependable way to look that up afterwards.

## What changes for people?

- **For players:** a proper profile, and a history of their games.
- **Older games:** only games played after this update appear in the list.
- **Cost:** a very small extra cost each time a game starts, which the game pays rather than the players.
- **Time:** about two days of work. It slots in before the computer player, so the later dates move by about two days. That leaves four days of buffer before the deadline instead of five.

## What could go wrong?

- **The game's code is nearly at its size limit.** This change fits, with a little room left over. If a later change doesn't fit, it goes into a separate small add-on instead.
- **The update to the live game could go wrong.** It gets the same safety checks as every earlier update, and only goes live when the maintainer says so.
