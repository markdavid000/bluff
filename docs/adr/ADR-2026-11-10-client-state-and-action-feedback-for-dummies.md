# Keeping every screen up to date and never feeling stuck, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-10-client-state-and-action-feedback.md](ADR-2026-11-10-client-state-and-action-feedback.md)

## What is the problem?

Everything in a game of Bluff (whose turn it is, the last bid, who has how many dice) is stored on the blockchain, not on our website. Every player's screen has to keep up with it. And every move takes a few seconds to be confirmed, so without care the game would feel slow or frozen.

## What are we doing about it?

We use one well-known tool to keep a copy of the game on each screen and refresh it the moment anything changes. Every move a player makes follows the same steps behind the scenes, and the screen shows only what matters to them, in plain words: the button reacts the instant it is pressed, a short message appears only if something takes a moment, and a clear result follows. Pop-up messages update in place instead of stacking up, disappear on their own when things go well, and stay with a "Try again" button when they do not.

## What changes for people?

Players see opponents' moves appear on their own, their own moves appear straight away, and messages that come and go at the right time. Developers have one way to show progress, so every screen behaves the same.

## What could go wrong?

If the network is very busy, a move can still take a while. We cannot speed up the network, so the game says so plainly after 15 seconds instead of looking stuck.
