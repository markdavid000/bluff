# Keep a computer player ready before anyone asks

- **Status:** Accepted
- **Technical version:** [ADR-2026-11-25-keep-a-computer-ready.md](ADR-2026-11-25-keep-a-computer-ready.md)

## What is the problem?

Bluff has a team of computer players, each with its own wallet. The first time a computer is ever used, it needs some setting up first: it's given a little test money to pay for its moves, and it saves its name and face. On the test network that takes about a minute, and today the player who asked for the computer waits through all of it. That's why Mama Dice, on her first ever game, took almost two minutes to arrive, while Baba Dice, who had played before, came much sooner.

## What are we doing about it?

The service will always keep one computer set up and waiting on the bench. When someone asks for a game, the benched computer sits down straight away, and the service quietly sets up the next one in the background. Computers will also refill their test money after a game instead of just before the next one.

## What changes for people?

Every player who asks for the computer waits about the same short time, roughly the 13 seconds it takes to sit down, whether it's the first computer of the day or the tenth. It costs a little more test money held in advance: one extra computer's worth, 0.02 test ETH. Nothing changes on screen, and the game itself plays the same.

## What could go wrong?

The background setup could fail, for example if the test network is slow. Then the service simply falls back to today's behaviour for that one request, logs the problem and tries again next time. Automatic tests cover each of these cases, and we'll try two games back to back on the test network before calling it done.
