# Giving chips their own cashier, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-11-bluff-cashier.md](ADR-2026-11-11-bluff-cashier.md)

## What is the problem?

Every program on the blockchain has a maximum size. With chips added, the game's program is slightly too big. We could squeeze it in, but then there would be no room left to fix mistakes after launch, which is exactly why we made the game updatable.

## What are we doing about it?

We split it in two, like a casino with a game table and a cashier's desk. The game program runs the dice, the bids and the rounds, and never touches money. A separate cashier program takes the chips when you join, hands them back if you leave the waiting room, and pays the winners. Each only listens to the other.

## What changes for people?

Players see no difference. The money is held in one small, focused place, which is easier to check and safer. Both programs keep room for future fixes.

## What could go wrong?

The two programs have to stay in step. Tests check that every chip that goes in comes out exactly once, however a game ends.
