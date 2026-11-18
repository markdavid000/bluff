# A few basic safety rules for the Bluff page

- **Status:** Approved
- **Companion:** [ADR-2026-11-18-security-headers.md](ADR-2026-11-18-security-headers.md)

## The problem

Right now, the Bluff page tells the browser nothing about how to protect it. Another website could show Bluff inside an invisible frame and trick people into clicking, and a few other small protections are missing.

## What we'll do

Every page will come with a short list of standard safety rules:

- no other website can show Bluff inside itself;
- always use a secure connection;
- don't guess what kind of file something is;
- don't tell other websites which Bluff page you came from;
- never ask for the camera, microphone or location (Bluff doesn't use them).

## What it costs

Almost nothing. The game is exactly as fast, and nothing about signing in, wallets or playing changes.

## What we're leaving for later

A stricter rule that only lets Bluff's own code run would give more protection. But it takes careful testing of every part of the game, and it could break something if we miss a detail. With practice chips and the deadline close, we're leaving it for later.
