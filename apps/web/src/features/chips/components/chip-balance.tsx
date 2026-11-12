"use client";

import { ActionButton } from "@/components/shared/action-button";
import { CountingAmount } from "@/components/shared/counting-amount";
import { Cowrie } from "@/components/shared/cowrie";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { formatChips } from "@/lib/chips";
import { chipsCopy } from "../copy";
import { useChipBalanceButton } from "../hooks/use-chip-balance-button";
import { ChipsPanel } from "./chips-panel";

export function ChipBalance() {
  const { balance, open, setOpen, needsYou } = useChipBalanceButton();

  if (balance.status === "hidden") {
    return (
      <ActionButton
        tone="yellow"
        size="small"
        icon="lock"
        working={balance.revealing}
        workingLabel={chipsCopy.showingChips}
        title={balance.asksWallet ? chipsCopy.showChipsHelp : undefined}
        onClick={balance.reveal}
      >
        {chipsCopy.showChips}
      </ActionButton>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          aria-label={chipsCopy.openChips}
          className="relative flex items-center gap-2 rounded-full bg-tile px-3 py-1 text-tile-foreground shadow-[0_3px_0_0_var(--color-tile-edge)] transition-[translate,box-shadow] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-0.5 active:shadow-[0_1px_0_0_var(--color-tile-edge)]"
        >
          <Cowrie size={26} />
          {balance.status === "ready" ? (
            <span aria-live="polite" className="font-game text-lg">
              <CountingAmount
                amount={balance.amount}
                format={(amount) => chipsCopy.balance(formatChips(amount))}
              />
            </span>
          ) : balance.status === "failed" ? (
            <span className="font-game text-base">{chipsCopy.tryAgain}</span>
          ) : (
            <span role="status" className="h-5 w-16 animate-pulse rounded-md bg-muted">
              <span className="sr-only">{chipsCopy.balanceLoading}</span>
            </span>
          )}
          {needsYou ? (
            <span className="absolute -top-1 -right-1 flex size-3.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-seat-green opacity-75 motion-reduce:animate-none" />
              <span className="relative inline-flex size-3.5 rounded-full border-2 border-background bg-seat-green" />
              <span className="sr-only">{chipsCopy.needsYou}</span>
            </span>
          ) : null}
        </button>
      </DialogTrigger>
      <DialogContent>
        <ChipsPanel />
      </DialogContent>
    </Dialog>
  );
}
