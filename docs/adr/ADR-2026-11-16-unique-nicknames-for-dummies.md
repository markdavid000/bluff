# Every nickname belongs to one player, in plain English

- **Status:** Proposed
- **Technical version:** [ADR-2026-11-16-unique-nicknames.md](ADR-2026-11-16-unique-nicknames.md)

## What is the problem?

Players used to show with a short code after their name, like "Maki #7BAC". We took the code away at the table because it made messages long. Without it, two players who both chose "Maki" look the same, so you can't tell who bid or who called your bluff.

## What are we doing about it?

Once a player picks a nickname, nobody else can pick it. "Maki" and "maki" count as the same name. The game itself keeps this list, so it can't be got around, and the sign-up screen tells you straight away if a name is taken, before you save.

## What changes for people?

- **Picking or changing a nickname:** if someone already has the name, you see "That nickname is taken. Try another." and pick a different one.
- **Changing your nickname:** your old one becomes free for someone else.
- **Players who already share a name:** whoever had it first keeps it. The others keep theirs until they change it, but nobody new can take it. Today that's at most a few test accounts.
- **The work:** an update to the part of the game that stores nicknames, made on the test network only after you approve it. It costs a tiny bit more to save a nickname, which players don't pay.

## What could go wrong?

- **The update to the stored game data could be done wrong.** The same safety checks we used for earlier updates catch this before anything goes live.
- **Two players could pick the same name at the same moment.** The game accepts the first and politely refuses the second.
