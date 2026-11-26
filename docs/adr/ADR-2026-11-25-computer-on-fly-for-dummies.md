# Run the computer players on Fly.io instead of Railway

- **Status:** Accepted
- **Technical version:** [ADR-2026-11-25-computer-on-fly.md](ADR-2026-11-25-computer-on-fly.md)

## What is the problem?

The computer players need a small server running on the internet. We planned to use Railway, but our free trial there has ended, and Railway now wants $5 a month before it will run anything. Our backup plan was Fly.io, which gives $5 of free usage every month once a card is on the account. Our small server should fit inside that.

## What are we doing about it?

We'll run the computer players on Fly.io as one small server that is always on. We add two short setup files to the project that tell Fly how to build and run it, and update our guides to match. The secret phrase that controls the computers' wallets is typed in by the maintainer on Fly's website and never shared anywhere else.

## What changes for people?

Players won't notice anything, except that the computer never has to "wake up", because the server never sleeps. It should cost nothing, staying within Fly's free monthly allowance. Updates are sent to Fly by hand when we release.

## What could go wrong?

If two copies of the server ever ran at once, they'd try to send the same computer player to two tables and could waste the test money. We set Fly to run exactly one copy, check it after every update, and write that rule down for everyone. If the server goes down, the game still works with real people; only "Play the computer" says the computer can't be reached.
