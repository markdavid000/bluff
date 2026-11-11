# The computer player, explained simply

- **Technical version:** [ADR-2026-11-11-computer-player.md](ADR-2026-11-11-computer-player.md)

## What is being decided

How you can play Bluff when nobody else is around: against the computer.

## How it works for you

- In the lobby, press **Quick game**. A table is set up and the computer, called **Baba Dice**, sits down opposite you. The game starts by itself.
- If you press **Play now** and nobody joins within 30 seconds, the game offers to let you play the computer instead.
- Baba Dice always shows a "Computer" badge, so you know who you're playing.

## Does the computer cheat?

No, and it can't. Its dice are hidden from you, and yours are hidden from it, exactly as with a person. It sees only its own dice, then works out the odds and decides whether to raise or call. Sometimes it bluffs, just like a real player. It takes a few seconds to "think", so the game feels natural.

## Where it lives

The computer runs on its own small server, on a service called Railway. When nobody is playing it, it sleeps, which keeps costs close to zero. It wakes up in a few seconds when someone presses Quick game.

## What it costs

- Railway gives $5 of free credit for the first 30 days. We'll start it in late November so it covers the demo and judging. After that it's about $5 a month, only if we still need it.
- The computer pays for its own moves with test money, which is free. We just top it up now and then.
- It only plays free tables, so it never wins or loses anyone's chips.

## How we'll know it works

We'll play full games against it, check it never makes an illegal move, and check that it can never see your dice.
