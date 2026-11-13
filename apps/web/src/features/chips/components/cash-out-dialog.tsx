"use client";

import { useId } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatChips } from "@/lib/chips";
import { chipsCopy } from "../copy";
import type { CashOutAmount } from "../hooks/use-cash-out";
import { useCashOutForm } from "../hooks/use-cash-out-form";

export function CashOutDialog({
  open,
  onOpenChange,
  balance,
  working,
  confirmInWallet,
  cashOut,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: bigint;
  working: boolean;
  confirmInWallet: boolean;
  cashOut: (amount: CashOutAmount) => void;
}) {
  const form = useCashOutForm(balance);
  const inputId = useId();
  const helpId = useId();
  const workingLabel = confirmInWallet ? chipsCopy.confirmInWallet : chipsCopy.cashOutWorking;

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (working) return;
        if (!next) form.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <PatternFrame roomy>
          <form
            className="flex flex-col gap-8"
            onSubmit={(event) => {
              event.preventDefault();
              form.submit(cashOut);
            }}
          >
            <div className="flex flex-col gap-2">
              <DialogTitle>{chipsCopy.cashOutTitle}</DialogTitle>
              <DialogDescription>{chipsCopy.cashOutHelp}</DialogDescription>
            </div>
            <div className="flex flex-col gap-3">
              <label htmlFor={inputId} className="font-game text-lg">
                {chipsCopy.cashOutAmount}
              </label>
              <input
                id={inputId}
                inputMode="decimal"
                autoComplete="off"
                value={form.text}
                disabled={working}
                aria-invalid={form.invalid || undefined}
                aria-describedby={helpId}
                onChange={(event) => form.change(event.target.value)}
                className="rounded-xl border-2 border-tile-edge/50 bg-background px-4 py-3 font-game text-2xl tabular-nums focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none"
              />
              <p id={helpId} aria-live="polite" className="text-sm text-muted-foreground">
                {chipsCopy.cashOutAmountHelp(formatChips(balance))}
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <ActionButton
                type="submit"
                tone="green"
                icon="dollar"
                sound="cowries"
                working={working}
                workingLabel={workingLabel}
              >
                {chipsCopy.cashOutSome}
              </ActionButton>
              <ActionButton
                type="button"
                tone="quiet"
                icon="money-bag"
                disabled={working || balance === 0n}
                onClick={() => cashOut("everything")}
              >
                {chipsCopy.cashOutAll}
              </ActionButton>
            </div>
            <DialogClose asChild>
              <ActionButton type="button" tone="quiet" size="small" icon="back" disabled={working}>
                {chipsCopy.close}
              </ActionButton>
            </DialogClose>
          </form>
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
