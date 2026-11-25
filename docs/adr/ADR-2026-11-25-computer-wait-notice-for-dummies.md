# Tell players the computer won't wait forever, and let them call it back

- **Status:** Accepted
- **Technical version:** [ADR-2026-11-25-computer-wait-notice.md](ADR-2026-11-25-computer-wait-notice.md)

## What is the problem?

When you sit down with the computer and don't start the game, the computer gets up and leaves after about 5 minutes. That's on purpose: it stops anyone from tying up all our computer players at empty tables. But the screen never says so, and it shows a 10-minute countdown for the table, so when the computer leaves early it looks like something broke. To get a computer back, you have to leave and start over.

## What are we doing about it?

While the computer is sitting at your table, a short line says it waits about 5 minutes for the game to start. If it does leave, the message says why ("left because the game didn't start"), and a **Call the computer back** button appears in its empty seat. One press brings a computer back to the same table.

## What changes for people?

Players understand why the computer left, and can get it back with one tap instead of starting a new table. Nothing changes about the 5-minute rule itself, the game, or the cost of running it.

## What could go wrong?

If the table is very close to closing, the computer may decline to come back. The player then sees the same plain message we already use when the computer can't join. Automatic tests cover the new messages and the button, and we'll check it by hand by waiting at a table until the computer leaves and calling it back.
