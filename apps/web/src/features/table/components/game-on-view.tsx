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

export function GameOnView({
  leaving,
  leavingLabel,
  onLeave,
}: {
  leaving: boolean;
  leavingLabel: string;
  onLeave: () => void;
}) {
  const leave = useLeaveConfirm(onLeave);
  return (
    <PatternFrame className="w-full max-w-xl">
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <h1 className="text-3xl">{tableCopy.gameOn}</h1>
        <p className="text-base text-muted-foreground">{tableCopy.gameScreenSoon}</p>
        <ActionButton
          tone="quiet"
          icon="back"
          working={leaving}
          workingLabel={leavingLabel}
          onClick={leave.ask}
        >
          {tableCopy.leave}
        </ActionButton>
      </div>
      <Dialog open={leave.asking} onOpenChange={leave.setAsking}>
        <DialogContent>
          <PatternFrame roomy>
            <div className="flex flex-col gap-8">
              <div className="flex flex-col gap-2">
                <DialogTitle>{tableCopy.leaveConfirmTitle}</DialogTitle>
                <DialogDescription>{tableCopy.leaveWarning}</DialogDescription>
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
    </PatternFrame>
  );
}
