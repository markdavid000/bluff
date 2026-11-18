# Playing Bluff against the computer, explained simply

- **Status:** Approved
- **Technical version:** [ADR-2026-11-18-computer-player.md](ADR-2026-11-18-computer-player.md)
- **Replaces:** [the first plan from 11 November](ADR-2026-11-11-computer-player-for-dummies.md)

## What is being decided

How you can play Bluff when nobody else is around: against the computer.

## Why we're updating the first plan

The idea from 11 November is still right. A lot has been built since, and checking it carefully against the game as it is now turned up two mistakes worth fixing before we build:

1. **One computer can only sit at one table at a time.** The game allows each player one seat. So instead of one computer, there's a whole team of them, up to 20, each its own player with its own name: **Baba Dice**, **Mama Dice**, **Oga Dice**, **Iya Dice**, **Chief Dice** and more. When everyone in the team is busy, a new one joins in a few seconds, so a judge who comes along while others are playing still gets a game.
2. **The first plan trusted something it couldn't check.** It believed whoever asked for the computer, without proof. Now the computer only checks things anyone can see on the game's public record: the table is free, open to everyone, just made, and a two-player table with only you in it.

## How it works for you

- In the lobby, press **Play the computer**. A table is set up, and a computer player sits down opposite you, already ready. You press **Start the game**, the same as any game.
- The old **Play now** button is renamed **Quick play**. It still does the same thing: it finds a table with real people, or makes one.
- If a person happens to grab the seat first, you play them instead, and the app tells you.
- Computer players always show a **Computer** badge, so you know who you're playing.
- It takes a few seconds to "think", like a person would.

## Does the computer cheat?

No, and it can't:

- **It can't see your dice.** The game itself only lets each player unlock their own dice, and that applies to the computer exactly as it does to you. We'll prove it by having the computer try to unlock someone else's die and showing it's refused.
- **You can't see its dice either.** It never shows them to anyone.
- **It plays by the odds.** It works out how likely a bid is from its own dice, raises or calls, and sometimes bluffs, just like a real player.

## What we're not changing

- **The game's rules and its records on the network don't change at all.** The computer is an ordinary player, so nothing in the game's code is touched or upgraded.
- **Chips are never involved.** It only plays free tables.

## Where it lives and what it costs

- **It runs on a small service called Railway.** It sleeps when nobody is playing, and wakes in a few seconds when someone presses Play the computer.
- **Railway's free trial covers the first month.** After that it's $5 a month, and only if we still need it.
- **The computer players need a little free test money** to make their moves. One "bank" wallet holds it and hands it out to them automatically, so we only ever top up that one.

## Why the computers don't use Privy

Privy, which handles your sign-in, can also make wallets for a server, so we looked at it. We chose not to:

- **The game money is free test money,** so there's nothing for Privy to pay for.
- **It would mean giving the computer's server the master key to our whole Privy setup,** players' accounts included. Our way, the computer's key only controls a little test money.
- **Every move would make an extra trip to Privy,** which makes the computer slower and gives it one more thing that can break.

Your own moves are still paid for by Privy, exactly as now.

## What could go wrong, and what happens then

- **The computer is asleep:** you see "Waking the computer…" for a few seconds.
- **20 games against the computer are already going at once:** you're told to try again in a minute. That's far more than we expect, and it's one setting to raise.
- **The encryption service hiccups during its turn:** the computer runs out of time and loses a die, the same as a person whose app had trouble. It never guesses.

## What the odds settings mean

The computer calls a bid when it thinks the bid is less than 35% likely to be true. It bluffs on about 1 in 7 of its raises (15%), so you can't read it too easily. These numbers only steer the computer. The hints you see while bidding keep their own settings and don't change.

## Ideas for later

A computer that remembers how you play, for example how often you bluff, and adjusts. It's a nice idea, but it isn't in this version.

## How we'll know it works

- **First, a quick test:** before building anything, we check that the computer can unlock its own dice and is refused someone else's.
- **Then tests** that the computer never makes an illegal move, always calls an impossible bid, and never shows its dice.
- **Finally, full games against it,** signed in with Google and with MetaMask, including two games at once and a restart in the middle of a game.
