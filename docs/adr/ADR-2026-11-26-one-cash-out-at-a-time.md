# ADR-2026-11-26: One cash out at a time

- **Status:** Accepted
- **Approved by:** the maintainer, 2026-11-26 (Option A, chosen in chat).
- **Companion:** [ADR-2026-11-26-one-cash-out-at-a-time-for-dummies.md](ADR-2026-11-26-one-cash-out-at-a-time-for-dummies.md)
- **Amends:** [ADR-2026-11-11-chips-and-buy-ins](ADR-2026-11-11-chips-and-buy-ins.md)

## Context

The 2026-11-26 full check found that a new cash out can quietly turn into an old one.

A cash out has two transactions:

1. **`unwrap`** burns the encrypted chips and emits `UnwrapRequested(id)`.
2. **`finalizeUnwrap(id, amount, proof)`** pays out the practice dollars once the amount has been made public and its proof is ready.

If the player closes the page between the two, the request stays open. The app remembers its id (`rememberCashOut`), and the chips panel offers **"Your last cash out did not finish. Finish it now"** (`chips-panel.tsx`), which runs `resume`.

**The defect:** the cash-out dialog still takes a new amount while a request is open. `useCashOut.cashOut` (`apps/web/src/features/chips/hooks/use-cash-out.ts`) runs:

```ts
const unfinished = await firstOpenCashOut(publicClient, account, rememberedCashOuts(account));
await finish(unfinished ?? (await burn(amount, report)), report);
```

So when a request is open:

- it finishes the old one;
- it ignores the amount the player just typed;
- it shows the normal "Chips cashed out" toast.

No chips are lost: the old request was already burned and gets paid out. But the player asked for one thing and got another, without being told.

This change touches chips, which AGENTS.md Directive 2 lists as non-trivial, hence this ADR.

**Unconfirmed:** whether the chip token (Zama's confidential ERC-20 wrapper, deployed outside this repo) allows two open `unwrap` requests from one account at once. None of the options below depends on it, but option B's single tap would.

## Options considered

### Option A: Refuse a new amount while one is open (proposed)

- **While a cash out is open:**
  - the "Cash out" button and its dialog take no new amount;
  - the panel says the last cash out must finish first;
  - the existing Finish button is the only action.
- **If the open request is only found once the player has started** (the panel's check is a separate read that may still be loading), the action stops before any transaction. It shows an error toast saying to finish the last cash out first.
- **Cost:** one new line of copy, a guard in `useCashOut.cashOut`, a disabled state in the panel and dialog, and tests.
- **Gives:** the player always gets what they asked for, or a clear reason why not. No extra transactions, no new chain reads.

### Option B: Finish the old one, then do the new one, in one tap

- **What:** `cashOut` would finalise the open request, then `burn` and `finish` the new amount.
- **Gives:** the player gets both.
- **Costs:**
  - up to three wallet confirmations for an own-wallet player;
  - a longer wait;
  - it can stop halfway, with the old request paid and the new one not started, which needs its own message and recovery path.

### Option C: Keep the behaviour, change the message

- **What:** say "We finished your earlier cash out. Cash out again for the new amount."
- **Gives:** the least code.
- **Costs:** the typed amount is still ignored, only now with an explanation. The surprise remains.

## Decision

**Option A.**

1. **Hook (`useCashOut.cashOut`):** if `firstOpenCashOut` finds an open request, throw a new `CashOutWaitingError` before preparing or sending anything. It's mapped to a plain error toast through the shared action status. `resume` is unchanged.
2. **Panel and dialog:** when `usePendingCashOut` reports an open request, the "Cash out" entry is disabled and shows the new copy, and the existing Finish button stays.
3. **Copy, in `features/chips/copy.ts`:** one line, "Finish your last cash out first. Then you can cash out more.", checked by `copy:check`.
4. **Unchanged:** no contract change, no new package, and `resume`, `burn` and `finish` keep their current steps.

## Diagram

```
 chips panel ──usePendingCashOut()──► open request?
   │ yes: [Finish it now] only, "Cash out" disabled + "Finish your last cash out first"
   │ no:  [Cash out] ─► dialog ─► useCashOut.cashOut(amount)
                                     ├─ firstOpenCashOut() finds one ─► stop: error toast, nothing sent
                                     └─ none ─► burn(amount) ─► finish(id) ─► "Chips cashed out"
```

## Consequences

- **Better:**
  - a typed amount is never swapped for another without saying so;
  - no transaction is sent on the player's behalf that they didn't ask for.
- **Worse:** a player with an open request must tap Finish first, then cash out again, which is two separate actions.
- **Removed:** the silent `unfinished ?? burn(...)` path in `cashOut`. Finishing an open request happens only through `resume`.
- **Packages:** none added or removed.

## Verification

- **Vitest, red first:**
  - `cashOut` with an open request sends no transaction and raises the new error, so the toast shows;
  - the panel disables "Cash out" and shows the copy while a request is open;
  - with no open request, the cash out runs as today;
  - `resume` still finishes an open request.
- **Manual check on Sepolia:**
  1. Start a cash out and close the tab after the `unwrap` confirms.
  2. Reopen the app. The panel offers only Finish, and "Cash out" is disabled.
  3. Tap Finish; the dollars arrive.
  4. A new cash out then works.
