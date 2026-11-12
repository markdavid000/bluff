"use client";

import { ActionButton } from "@/components/shared/action-button";
import { CountingAmount } from "@/components/shared/counting-amount";
import { Cowrie } from "@/components/shared/cowrie";
import { formatChips } from "@/lib/chips";
import { chipsCopy } from "../copy";
import { useChipBalance } from "../hooks/use-chip-balance";

export function ChipBalance() {
  const balance = useChipBalance({ automaticPermit: true });

  if (balance.status === "hidden") {
    return (
      <ActionButton
        tone="yellow"
        size="small"
        icon="cowrie"
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
    <span className="flex items-center gap-2 rounded-full bg-tile px-3 py-1 text-tile-foreground shadow-[0_3px_0_0_var(--color-tile-edge)]">
      <Cowrie size={26} />
      <span className="sr-only">{chipsCopy.balanceLabel}</span>
      {balance.status === "ready" ? (
        <span aria-live="polite" className="font-game text-lg">
          <CountingAmount
            amount={balance.amount}
            format={(amount) => chipsCopy.balance(formatChips(amount))}
          />
        </span>
      ) : balance.status === "failed" ? (
        <button type="button" className="font-game text-base underline" onClick={balance.retry}>
          {chipsCopy.tryAgain}
        </button>
      ) : (
        <span role="status" className="h-5 w-16 animate-pulse rounded-md bg-muted">
          <span className="sr-only">{chipsCopy.balanceLoading}</span>
        </span>
      )}
    </span>
  );
}
