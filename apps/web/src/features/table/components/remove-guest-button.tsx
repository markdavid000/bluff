"use client";

import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { tableCopy } from "../copy";
import { useConfirm } from "../hooks/use-confirm";

export function RemoveGuestButton({
  name,
  disabled,
  onRemove,
  compact = false,
}: {
  name: string;
  disabled: boolean;
  onRemove: () => void;
  compact?: boolean;
}) {
  const remove = useConfirm(onRemove);
  return (
    <>
      <ActionButton
        tone="quiet"
        size="small"
        icon="back"
        aria-label={tableCopy.removeGuest(name)}
        disabled={disabled}
        onClick={remove.ask}
        className={compact ? "size-8 min-h-0 rounded-full p-0" : undefined}
      >
        {compact ? null : tableCopy.removeButton}
      </ActionButton>
      <Dialog open={remove.asking} onOpenChange={remove.setAsking}>
        <DialogContent>
          <PatternFrame roomy>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <DialogTitle>{tableCopy.removeConfirmTitle(name)}</DialogTitle>
                <DialogDescription>{tableCopy.removeWarning}</DialogDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionButton tone="danger" icon="back" onClick={remove.confirm}>
                  {tableCopy.removeConfirm}
                </ActionButton>
                <DialogClose asChild>
                  <ActionButton tone="green" icon="tick">
                    {tableCopy.keepGuest}
                  </ActionButton>
                </DialogClose>
              </div>
            </div>
          </PatternFrame>
        </DialogContent>
      </Dialog>
    </>
  );
}
