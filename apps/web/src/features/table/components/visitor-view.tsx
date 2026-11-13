"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Avatar } from "@/components/shared/avatar";
import { Cowrie } from "@/components/shared/cowrie";
import { PatternFrame } from "@/components/shared/pattern-band";
import { formatChips } from "@/lib/chips";
import { tableCopy } from "../copy";
import type { useWaitingRoom } from "../hooks/use-waiting-room";
import { BackToLobby } from "./back-to-lobby";

type Room = NonNullable<ReturnType<typeof useWaitingRoom>["view"]>;

export function VisitorView({ room }: { room: Room }) {
  const { table, seats } = room;
  const paid = table.buyIn > 0n;
  const label = (working: string) => (room.confirm ? tableCopy.confirmInWallet : working);
  return (
    <PatternFrame className="w-full max-w-xl">
      <div className="flex flex-col items-center gap-5 py-2 text-center">
        <h1 className="text-3xl">{tableCopy.tableName(table.id.toString())}</h1>
        <div className="flex -space-x-3">
          {seats.map((seat) =>
            seat.avatarSrc ? (
              <Avatar key={seat.player} src={seat.avatarSrc} size={52} />
            ) : (
              <span
                key={seat.player}
                aria-hidden
                className="size-13 animate-pulse rounded-full bg-muted"
              />
            )
          )}
        </div>
        <p className="text-base text-muted-foreground">
          {tableCopy.playersAtTable(seats.length, table.seatCount)}
        </p>
        <p className="flex items-center gap-2 font-game text-lg">
          {paid ? <Cowrie size={24} /> : null}
          {paid ? tableCopy.chipsToPlay(formatChips(table.buyIn)) : tableCopy.free}
        </p>
        {room.joinProblem ? (
          <p className="text-base">{room.joinProblem}</p>
        ) : (
          <ActionButton
            tone="green"
            size="large"
            icon={paid ? "cowrie" : "rocket"}
            working={room.joining}
            workingLabel={label(
              room.joinStep === "invite" ? tableCopy.checkingInvite : tableCopy.joining
            )}
            onClick={room.join}
          >
            {paid ? tableCopy.payAndJoin(formatChips(table.buyIn)) : tableCopy.join}
          </ActionButton>
        )}
        <BackToLobby />
      </div>
    </PatternFrame>
  );
}
