"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Cowrie } from "@/components/shared/cowrie";
import { PatternFrame } from "@/components/shared/pattern-band";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { lobbyCopy } from "../copy";
import { useLeaveConfirm } from "../hooks/use-leave-confirm";
import { type LobbyTable, openSeats } from "../lib/tables";
import { buyInLabel } from "./buy-in-picker";
import { SeatDots } from "./seat-dots";

const WAITING = 1;
const VERIFYING = 2;

export function MyTableCard({
  table,
  status,
  leaving,
  leaveLabel,
  onLeave,
  onCopyInvite,
}: {
  table: LobbyTable;
  status: number;
  leaving: boolean;
  leaveLabel: string;
  onLeave: () => void;
  onCopyInvite: () => void;
}) {
  const waiting = status === WAITING;
  const free = openSeats(table);
  const line = waiting
    ? free > 0
      ? lobbyCopy.waitingFor(free)
      : lobbyCopy.everyoneHere
    : status === VERIFYING
      ? lobbyCopy.startsSoon
      : lobbyCopy.inGame;
  const leave = useLeaveConfirm({ needed: !waiting, leave: onLeave });

  return (
    <PatternFrame className="w-full">
      <section aria-labelledby="my-table-title" className="flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="my-table-title" className="text-3xl">
            {lobbyCopy.yourTable}
          </h2>
          <span className="flex items-center gap-2 font-game text-lg">
            {lobbyCopy.tableName(table.id.toString())}
            <span className="flex items-center gap-1 text-base text-muted-foreground">
              {table.buyIn === 0n ? null : <Cowrie size={20} />}
              {buyInLabel(table.buyIn)}
            </span>
          </span>
        </div>
        <div className="flex items-center gap-3">
          <SeatDots players={table.playerCount} seats={table.seatCount} />
          <p role="status" className="font-game text-lg">
            {line}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {waiting && free > 0 ? (
            <ActionButton tone="blue" icon="copy" onClick={onCopyInvite}>
              {lobbyCopy.copyInvite}
            </ActionButton>
          ) : null}
          <ActionButton
            tone="quiet"
            icon="back"
            working={leaving}
            workingLabel={leaveLabel}
            onClick={leave.request}
          >
            {lobbyCopy.leave}
          </ActionButton>
        </div>
      </section>
      <Dialog open={leave.asking} onOpenChange={leave.setAsking}>
        <DialogContent>
          <PatternFrame>
            <div className="flex flex-col gap-4">
              <DialogTitle>{lobbyCopy.leaveConfirmTitle}</DialogTitle>
              <DialogDescription>{lobbyCopy.leaveWarning}</DialogDescription>
              <div className="flex flex-wrap gap-3">
                <ActionButton tone="danger" icon="back" onClick={leave.confirm}>
                  {lobbyCopy.leaveConfirm}
                </ActionButton>
                <DialogClose asChild>
                  <ActionButton tone="green" icon="tick">
                    {lobbyCopy.stay}
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
