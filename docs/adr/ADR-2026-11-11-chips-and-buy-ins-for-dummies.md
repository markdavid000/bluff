# How chips and table entry work, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-11-chips-and-buy-ins.md](ADR-2026-11-11-chips-and-buy-ins.md)

## What is the problem?

Chip balances in Bluff are private: nobody, not even the game, can read how many chips you have. That is good for privacy, but it means the game cannot simply check whether you can afford a table. Someone with no chips could join a table, pay nothing, and still win everyone else's chips.

## What are we doing about it?

- **Chips are Zama's own practice dollars.** A free chip machine gives you 100 of them in one tap, once a day.
- **Paying and joining are one tap.** You never give the game permission to take chips from you later; it only receives what you send to join.
- **Paying is checked before the first roll.** When a table with chips on it starts, the game privately confirms that everyone paid. Anyone who did not is removed before the dice are rolled.
- **Your own app checks first.** Before you join, it looks at your balance (only you can see it) and tells you if you are short, with a button to get more.

## What changes for people?

Paid games take about half a minute longer to start. Free practice games start straight away. Nobody can sneak into a paid game.

## What could go wrong?

The chip machine relies on Zama's practice dollars staying free to create. If Zama changes that, we swap in our own practice chips; players would not notice.
