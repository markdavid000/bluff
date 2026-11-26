# One cash out at a time, in plain English

- **Status:** Accepted
- **Technical version:** [ADR-2026-11-26-one-cash-out-at-a-time.md](ADR-2026-11-26-one-cash-out-at-a-time.md)

## What is the problem?

Cashing out chips happens in two steps. If a player closes the app between them, their cash out is left half done, and the app offers a "Finish it now" button.

But the app also lets them start a new cash out while the old one is still half done. If they do:

- the app quietly finishes the old one instead;
- it ignores the number they just typed;
- it says "Chips cashed out" as if all went to plan.

Nobody loses chips, but the player gets something different from what they asked for, and nobody tells them.

## What are we doing about it?

While an old cash out is still half done, the app won't take a new one. It says "Finish your last cash out first. Then you can cash out more." and shows only the Finish button. Once that's done, cashing out works as normal.

## What changes for people?

- **Most players notice nothing.** It only matters if a cash out was left half done.
- **Players who left one half done** tap Finish first, then cash out again. That's one extra tap, but no surprises.
- **Cost:** a small change to the app, about half a day of work including tests. Nothing changes in the contracts.

## What could go wrong?

A player could be blocked if the app wrongly thinks a cash out is half done. The Finish button and the check behind it already exist and are tested, and the new tests cover both the "half done" and "nothing half done" cases. A check on Sepolia (start a cash out, close the tab, come back) confirms it before launch.
