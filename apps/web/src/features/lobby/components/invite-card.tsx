"use client";

import { ActionButton } from "@/components/shared/action-button";
import { lobbyCopy } from "../copy";
import type { TableRead } from "../hooks/use-table";
import { buyInLabel } from "./buy-in-picker";
import { SeatDots } from "./seat-dots";

export function InviteCard({
  id,
  read,
  problem,
  joining,
  joiningLabel,
  disabled,
  onJoin,
  onDismiss,
}: {
  id: bigint;
  read: TableRead;
  problem: string | null;
  joining: boolean;
  joiningLabel: string;
  disabled: boolean;
  onJoin: () => void;
  onDismiss: () => void;
}) {
  return (
    <section
      aria-labelledby="invite-title"
      className="flex flex-col gap-3 rounded-2xl border-2 border-seat-yellow-edge bg-seat-yellow/20 p-4"
    >
      <h2 id="invite-title" className="font-game text-xl">
        {lobbyCopy.invitedTitle(id.toString())}
      </h2>
      {read.status === "ready" ? (
        <p className="flex items-center gap-3 text-base">
          <SeatDots players={read.seated.table.playerCount} seats={read.seated.table.seatCount} />
          {lobbyCopy.playersAtTable(read.seated.table.playerCount, read.seated.table.seatCount)}
          <span className="font-game">{buyInLabel(read.seated.table.buyIn)}</span>
        </p>
      ) : read.status === "failed" ? (
        <p className="text-base">{lobbyCopy.invitedGone}</p>
      ) : (
        <p role="status" className="text-base text-muted-foreground">
          {lobbyCopy.invitedLoading}
        </p>
      )}
      {problem ? <p className="text-sm text-muted-foreground">{problem}</p> : null}
      <div className="flex flex-wrap gap-3">
        <ActionButton
          tone="green"
          size="small"
          icon="rocket"
          disabled={disabled || read.status !== "ready" || problem !== null}
          working={joining}
          workingLabel={joiningLabel}
          onClick={onJoin}
        >
          {lobbyCopy.join}
        </ActionButton>
        <ActionButton tone="quiet" size="small" icon="back" disabled={joining} onClick={onDismiss}>
          {lobbyCopy.cancel}
        </ActionButton>
      </div>
    </section>
  );
}
