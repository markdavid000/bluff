# Safer tools and a quiet checklist, in plain English

- **Status:** Approved
- **Approved by:** (MarkDavid, 15th Nov 2026)
- **Technical version:** [ADR-2026-11-14-tooling-hardening.md](ADR-2026-11-14-tooling-hardening.md)

## What is the problem?

Three things behind the scenes need tidying before the competition:

1. **A risky default.** If the tool that puts the game online ever ran without your own secret phrase, it would quietly use a phrase that's printed all over the internet. Whoever knows it could take control of the game's code. It has never happened, since the live game is owned by your key, but nothing stops it from happening.
2. **Warnings in our checklist.** Our quality checklist is meant to finish with zero warnings, but it prints two. One is an outdated setting in a code-checking tool. The other appears because this computer runs a newer version of Node, the program that runs our code, than the project expects.
3. **Out-of-date instructions.** A few guides still describe things that have changed.

## What are we doing about it?

1. The online-update tools will refuse to run without your own phrase, and refuse the public one outright.
2. We update the outdated setting, and the checklist checks first that you're on the project's version of Node. If you aren't, it stops and tells you how to switch.
3. We correct the guides.

## What changes for people?

Nothing for players. Developers need to use Node 24, the same version our automatic checks and hosting already use; switching takes one command.

## What could go wrong?

The outdated setting protects how our code is organised. If the update changed its meaning, a mistake could slip through. So we check it still blocks the mistake it's meant to block before we finish.
