# Stop seat squatters, and clear away dead tables

- **Status:** Accepted
- **Technical version:** [ADR-2026-11-25-unready-seats-and-expired-tables.md](ADR-2026-11-25-unready-seats-and-expired-tables.md)

## What is the problem?

Our review found two ways a table can get stuck. First, someone with no chips can still sit down at a paid table (the game can't see their chips until later), then never press Ready, so the game can never start. The host has no way to ask them to leave. If they do press Ready, the payment check throws them out, but they can sit straight back down and do it again. Second, if everyone walks away from a table, only someone sitting at it is allowed to close it, so it hangs around in the lobby after its time is up.

## What are we doing about it?

The host gets a **Remove** button on any guest who hasn't pressed Ready. Removed guests get back whatever they paid and can't sit at that table again. And once a table's time is up, anyone can close it, while the lobby simply stops showing expired tables.

## What changes for people?

Hosts can clear out someone who's holding up the game. The lobby only shows tables you can actually play at. Guests who are ready can never be removed. It needs one update to the game's contract on the test network, which the maintainer sends from their own key.

## What could go wrong?

A host could remove a guest unfairly, but only someone who hasn't pressed Ready, and that guest gets their chips back. The contract update could go wrong, so we use our standard safe-upgrade check, which refuses any change that would scramble existing tables, and test everything before and after.
