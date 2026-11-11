# Being able to fix the game after launch, safely, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-11-upgradeable-contracts-and-security.md](ADR-2026-11-11-upgradeable-contracts-and-security.md)

## What is the problem?

Once the game's rules are put on the blockchain, they normally cannot be changed. If we find a mistake after launch, we would have to start over at a new address, and every game and chip in the old one would be stranded.

## What are we doing about it?

We set the game up so its rules can be updated in place, at the same address, keeping every table, chip and hidden die. Only the owner can update it, and every update is public. The owner can also press pause on new games in an emergency, but can never stop a game in progress, take chips, end games or look at anyone's dice.

We also add automatic security checks to every change: a tool that scans the code for known kinds of weaknesses, and a rule that almost every line of the game's code must be tested.

## What changes for people?

Players get a game that can be fixed quickly if something goes wrong. In return, they are trusting the owner not to misuse the ability to update it, and we say so openly on the "How is this fair?" page. After the competition we plan to add a waiting period before any update, or switch updates off entirely.

## What could go wrong?

A careless update could break saved games. A safety tool checks every update before it can happen, and the tests check that games and hidden dice survive an update.
