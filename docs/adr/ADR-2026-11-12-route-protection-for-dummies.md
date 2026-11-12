# Strict route protection, explained simply

- **Technical version:** [ADR-2026-11-12-route-protection.md](ADR-2026-11-12-route-protection.md)

## What is being decided

How Bluff makes sure nobody can open a game page without signing in, not even for a split second.

## How it works

Think of a club with a bouncer at the door.

- **Signing in** happens with Google, email or your own wallet, through Privy, as agreed before. Privy hands your browser a short pass that proves who you are.
- **Bluff's bouncer** checks that pass once, then gives you a Bluff wristband: a secure cookie that only our server can read and nothing on the page can tamper with.
- **Every time you open a game page,** the bouncer checks your wristband before showing you anything. No wristband means you go to the sign-in page, and after signing in you're taken straight back to where you were going.
- **Wristbands last an hour** and renew themselves quietly while you play. If you come back after a long break, the app renews it for you without asking you to sign in again, unless you signed out.

## What's open and what's locked

- **Open to anyone:** the front page, how to play, and how Bluff stays fair.
- **Locked:** the lobby, your profile, the welcome page, and every table, including watching other people's games. (Earlier we said watching needed no sign-in; this changes that. Signing in with Google takes a few seconds.)

## Why not just use Privy's own cookie?

Privy only offers its cookie on a custom web address that we'd have to buy and verify. Our own wristband works everywhere, including the free Vercel address and your own computer.

## Is this what keeps the game safe?

It keeps people off the screens. The game itself is protected by the contracts on the network: every move is checked against the player's own wallet, and the wristband can never make a move for you.

## What it costs

- One small, widely used building block called `jose`, which checks the passes.
- One private setting to keep on the server: a secret for signing wristbands. Privy's public keys are fetched directly from Privy, so they stay up to date on their own.
