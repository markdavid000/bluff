# A waiting room where everyone gets ready, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-12-waiting-room-and-ready.md](ADR-2026-11-12-waiting-room-and-ready.md)

## What is the problem?

Right now a free table starts the instant its last seat is filled, before anyone has said they're ready. If someone then leaves, the game is over and the other player is pushed out as the winner, which feels like being made to leave. Paid tables behave differently, so the same button does different things depending on the table.

## What are we doing about it?

Tables will wait in a proper waiting room until the host starts them:

- Everyone sitting at the table appears as their face (avatar).
- Each player has a **Ready** button that switches to **Not ready**, and a ready mark on their face shows everyone where they stand.
- When someone changes, the others get a short message, like "Kola is ready".
- The host's **Start the game** button works once everyone else is ready.
- Leaving before the start only frees your own seat; nobody else is moved.

The game's rules live on the blockchain, so we update them there for this to work.

## What changes for people?

- Players see each other gather, get ready, and start together, the same way on free and paid tables.
- Pressing Ready takes a few seconds to confirm for everyone. Your own mark changes at once while it confirms. It's free for people who signed in with Google or email; people using their own wallet confirm it in their wallet.
- A table now needs its host to press Start. If the host walks away, the table can be closed after 10 minutes, as it can today, and paid players get their chips back.

## What could go wrong?

The update to the game's rules on the blockchain could go wrong. We'll catch that with automatic tests for every new rule, a check that existing tables survive the update, and a real two-player run on the test network, once with free and once with paid chips, before anything is built on top.
