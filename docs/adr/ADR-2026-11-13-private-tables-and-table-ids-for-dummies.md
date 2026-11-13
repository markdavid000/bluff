# Private tables that really are private, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-13-private-tables-and-table-ids.md](ADR-2026-11-13-private-tables-and-table-ids.md)

## What is the problem?

Tables are numbered 1, 2, 3 and so on, so anyone can guess the next table's link. Worse, a "private" table is only hidden from the lobby list. Anyone who types its number can sit down at it.

Making the numbers random doesn't fix that on its own. The game runs on a public blockchain, where anyone can look up every table that exists. So we need a secret that only invited players hold.

## What are we doing about it?

Every private table gets a secret invite code, made by the game itself and kept **encrypted** using Zama's technology.

- The code travels inside the invite link. The part of a link after the `#` never leaves the player's own browser.
- The host can always see the code to share it again, and so can anyone who joined with it. Nobody else can.
- When someone opens the link, their app sends the code, still encrypted. The game checks whether it matches without either code ever being revealed. The only thing made public is the answer: right or wrong.
- Only players with the right code can sit at a private table.

Table numbers also become long random numbers, so links can't be guessed.

## What changes for people?

- **Hosts:** nothing new to do. Create a private table and copy the invite link as before.
- **Invited players:** joining a private table takes about half a minute instead of about 12 seconds, while the game checks the invite. The screen says "Checking your invite…" the whole time. Players who signed in with Google or email aren't asked for anything. Players using their own wallet approve 3 steps instead of 1.
- **Anyone else** who finds the table is told it's private and to ask the host for the link. A wrong or broken link gets a short message saying to ask for a new one.
- **Public tables** don't change, apart from their longer numbers.
- **The team** deploys and looks after one more small contract.

## What could go wrong?

- **Joining a private table is slower.** We'll measure it on the test network and show progress the whole time.
- **The game's main contract is nearly full.** Blockchains cap how big a contract can be. Our own rule keeps a safety margin below that cap, and this change would eat into the margin. It stays under the real cap, so you need to choose: shrink our safety margin (recommended, quick), or first move some of the main contract into a new one (slower, bigger job).
- **Anyone who has the link can join.** A forwarded link works for whoever receives it, just like a party invitation.
