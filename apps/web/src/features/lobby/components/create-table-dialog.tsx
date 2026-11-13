"use client";

import { cn } from "cn";
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
import { lobbyCopy } from "../copy";
import { useCreateTableForm } from "../hooks/use-create-table-form";
import { SEAT_COUNTS, type SeatCount } from "../lib/tables";
import { BuyInPicker } from "./buy-in-picker";

const DICE_BUDGET = 6;

export function CreateTableDialog({
  open,
  onOpenChange,
  buyIn,
  onBuyInChange,
  problem,
  working,
  workingLabel,
  onCreate,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyIn: bigint;
  onBuyInChange: (buyIn: bigint) => void;
  problem: string | null;
  working: boolean;
  workingLabel: string;
  onCreate: (seatCount: SeatCount, isPrivate: boolean) => void;
}) {
  const form = useCreateTableForm();
  const seatsName = useId();
  const privateId = useId();
  const privateHelpId = useId();

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!working) onOpenChange(next);
      }}
    >
      <DialogContent>
        <PatternFrame roomy>
          <form
            className="flex flex-col gap-8"
            onSubmit={(event) => {
              event.preventDefault();
              onCreate(form.seatCount, form.isPrivate);
            }}
          >
            <DialogTitle>{lobbyCopy.createTitle}</DialogTitle>
            <DialogDescription className="sr-only">{lobbyCopy.createTable}</DialogDescription>
            <fieldset role="radiogroup" className="flex flex-col gap-3" disabled={working}>
              <legend className="mb-3 font-game text-lg">{lobbyCopy.seats}</legend>
              <div className="flex flex-wrap gap-3">
                {SEAT_COUNTS.map((count) => {
                  const checked = form.seatCount === count;
                  return (
                    <label
                      key={count}
                      className={cn(
                        "flex cursor-pointer flex-col gap-0.5 rounded-xl border-2 px-5 py-3 select-none has-focus-visible:ring-4 has-focus-visible:ring-ring/60",
                        checked
                          ? "border-seat-yellow-edge bg-seat-yellow text-seat-yellow-foreground"
                          : "border-tile-edge/50 bg-tile text-tile-foreground"
                      )}
                    >
                      <input
                        type="radio"
                        name={seatsName}
                        className="sr-only"
                        checked={checked}
                        onChange={() => form.chooseSeats(count)}
                      />
                      <span className="font-game text-base">{lobbyCopy.seatCount(count)}</span>
                      <span className="text-xs opacity-80">
                        {lobbyCopy.dicePerPlayer(DICE_BUDGET - count)}
                      </span>
                    </label>
                  );
                })}
              </div>
            </fieldset>
            <BuyInPicker value={buyIn} onChange={onBuyInChange} disabled={working} />
            <div className="flex items-start gap-3">
              <input
                id={privateId}
                type="checkbox"
                checked={form.isPrivate}
                disabled={working}
                aria-describedby={privateHelpId}
                onChange={form.togglePrivate}
                className="mt-1 size-5 accent-seat-green"
              />
              <span className="flex flex-col gap-1">
                <label htmlFor={privateId} className="font-game text-base">
                  {lobbyCopy.private}
                </label>
                <span id={privateHelpId} className="text-sm text-muted-foreground">
                  {lobbyCopy.privateHelp}
                </span>
              </span>
            </div>
            {problem ? <p className="text-sm text-destructive">{problem}</p> : null}
            <div className="flex flex-wrap gap-3">
              <ActionButton
                type="submit"
                tone="green"
                icon="plus"
                disabled={problem !== null}
                working={working}
                workingLabel={workingLabel}
              >
                {lobbyCopy.create}
              </ActionButton>
              <DialogClose asChild>
                <ActionButton type="button" tone="quiet" icon="back" disabled={working}>
                  {lobbyCopy.cancel}
                </ActionButton>
              </DialogClose>
            </div>
          </form>
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
