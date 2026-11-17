# Everyone presses Ready again when a paid table reopens

- **Status:** Approved
- **Companion:** [ADR-2026-11-17-ready-again-after-reopen.md](ADR-2026-11-17-ready-again-after-reopen.md)

## The problem

At a table that costs chips, the game checks everyone's chips before it starts. If someone's chips didn't arrive, the game removes that player and opens the table again so someone else can sit down.

Today, everyone who had pressed Ready stays ready. So the host can start again straight away, maybe with a new player, without the others saying they're happy to play.

## What we'll do

When a table opens again, everyone goes back to "not ready." The table says "The table is open again. Press Ready to play." The host can start once everyone has pressed Ready again.

## What it costs

The game's code has a safety margin of spare room, so future fixes can be tested safely. This fix uses a little of that margin, shrinking it from 896 to 768 bytes. There's still plenty of room under the real limit, and the safety test still works.

We'll update the live game on the test network only once you say yes.

## How we'll know it works

Tests show that after a table reopens, nobody is ready, and the game won't start until they press Ready again. Then we try it live with two accounts.
