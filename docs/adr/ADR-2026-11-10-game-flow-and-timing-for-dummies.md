# How a game of Bluff flows from start to finish, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-10-game-flow-and-timing.md](ADR-2026-11-10-game-flow-and-timing.md)

## What is the problem?

We had decided how a round of Bluff works, but not everything around it: how people sign up, find a game, wait for others, what happens if someone walks away, and how a game ends. Our numbers also showed that a four-player game could drag on for over 20 minutes.

## What are we doing about it?

- **Short, even games.** Every table starts with about eight dice in total: four each for two players, three each for three, two each for four. Games last about 8 to 12 minutes, and a 15-minute clock makes sure no game drags.
- **A simple path in.** Sign in with Google or email, get a nickname and 100 free practice chips, then press "Play now" to be seated straight away, or create a table and share its link with friends.
- **Quick turns.** You get 30 seconds to make your move. If you run out of time, you lose a die. Miss two turns and you are out.
- **Leaving has a price.** You can leave a waiting room for free. Leaving a game in progress means losing your chips for that table.
- **Nothing gets stuck.** Every way a game could stall has a deadline, and the game handles it by itself.

## What changes for people?

Players get quick, predictable games and are never left waiting on someone who walked away. Creating a table means two choices: how many players and how many chips.

## What could go wrong?

Moves still take a few seconds to confirm, so our timings are estimates until we play real test games. If games run long or short, we adjust the number of dice and the clock.
