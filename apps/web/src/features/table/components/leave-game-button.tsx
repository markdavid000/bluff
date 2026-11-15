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
import { useLeaveConfirm } from "../hooks/use-leave-confirm";

export function LeaveGameButton({
  paid,
  leaving,
  leavingLabel,
  disabled,
  onLeave,
}: {
  paid: boolean;
  leaving: boolean;
  leavingLabel: string;
  disabled: boolean;
  onLeave: () => void;
}) {
  const leave = useLeaveConfirm(onLeave);
  return (
    <>
      <ActionButton
        tone="quiet"
        size="small"
        icon="back"
        disabled={disabled}
        working={leaving}
        workingLabel={leavingLabel}
        onClick={leave.ask}
      >
        {tableCopy.leave}
      </ActionButton>
      <Dialog open={leave.asking} onOpenChange={leave.setAsking}>
        <DialogContent>
          <PatternFrame roomy>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <DialogTitle>{tableCopy.leaveConfirmTitle}</DialogTitle>
                <DialogDescription>
                  {paid ? tableCopy.leaveWarning : tableCopy.leaveWarningFree}
                </DialogDescription>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionButton tone="danger" icon="back" onClick={leave.confirm}>
                  {tableCopy.leaveConfirm}
                </ActionButton>
                <DialogClose asChild>
                  <ActionButton tone="green" icon="tick">
                    {tableCopy.stay}
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
