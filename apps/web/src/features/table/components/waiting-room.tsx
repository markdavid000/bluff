"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { CountdownBadge } from "@/components/shared/countdown-badge";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { tableCopy } from "../copy";
import type { useWaitingRoom } from "../hooks/use-waiting-room";
import { seatLayout } from "../lib/seat-layout";
import { useTipsOnFirstVisit } from "../hooks/use-tips-dialog";
import { GameBoard } from "./board/game-board";
import { CopyInviteButton } from "./copy-invite-button";
import { InviteSeat } from "./invite-seat";
import { SeatBadge } from "./seat-badge";

type Room = NonNullable<ReturnType<typeof useWaitingRoom>["view"]>;

const SLOT: Record<"top" | "left" | "right" | "bottom", string> = {
  top: "col-start-2 row-start-1 justify-self-center",
  left: "col-start-1 row-start-2 justify-self-end",
  right: "col-start-3 row-start-2 justify-self-start",
  bottom: "col-start-2 row-start-3 justify-self-center",
};

const POT_STACKS = 6;

export function WaitingRoom({ room }: { room: Room }) {
  useTipsOnFirstVisit();
  const colors = useThemeColors();
  const { table, seats } = room;
  const seatCount = table.seatCount;
  const mySeat = Math.max(
    seats.findIndex((seat) => seat.isMe),
    0
  );
  const layout = seatLayout(seatCount, mySeat);
  const taken = layout.slice(0, seats.length);
  const waiting = table.status === "waiting";
  const label = (working: string) => (room.confirm ? tableCopy.confirmInWallet : working);

  return (
    <div className="flex max-h-full min-h-0 w-full max-w-4xl flex-1 flex-col items-center gap-4 overflow-hidden px-2 pt-1 pb-4">
      <div className="grid min-h-0 w-full flex-1 grid-cols-[minmax(5rem,auto)_minmax(0,1fr)_minmax(5rem,auto)] grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-3">
        {layout.map((placement, index) => {
          const seat = seats[index];
          return (
            <div key={placement.side} className={SLOT[placement.side]}>
              <Appear show={seat !== undefined || waiting} swapKey={seat?.player ?? "open"}>
                {seat ? (
                  <SeatBadge
                    name={seat.name}
                    avatarSrc={seat.avatarSrc}
                    ready={seat.ready}
                    isHost={seat.isHost}
                    isMe={seat.isMe}
                    isComputer={seat.isComputer}
                    updating={seat.isMe && room.toggling}
                  />
                ) : waiting ? (
                  <InviteSeat onInvite={room.copyInvite} waiting={room.invite === "loading"} />
                ) : null}
              </Appear>
            </div>
          );
        })}
        <div
          data-board-space
          className="[container-type:size] col-start-2 row-start-2 flex h-full min-h-0 items-center justify-center"
        >
          <div className="relative aspect-square w-[min(100cqw,100cqh)]">
            <GameBoard
              colors={colors}
              seats={taken}
              throwState={{ kind: "idle" }}
              chipsEach={table.buyIn > 0n ? POT_STACKS : 0}
              revealed={false}
              label={tableCopy.boardLabel}
            />
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-4">
        <p role="status" aria-live="polite" className="text-center font-game text-xl">
          <Appear show swapKey={room.timeUp ? tableCopy.timeUp : room.line} inline>
            {room.timeUp ? tableCopy.timeUp : room.line}
          </Appear>
        </p>
        <Appear show={waiting && !room.timeUp}>
          <CountdownBadge label={tableCopy.closesIn} remainingMs={room.timeLeft} />
        </Appear>
      </div>
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Appear show={waiting && room.role === "guest"}>
          <ActionButton
            tone={room.myReady ? "quiet" : "green"}
            icon={room.myReady ? "back" : "tick"}
            working={room.toggling}
            workingLabel={label(room.myReady ? tableCopy.gettingReady : tableCopy.standingDown)}
            disabled={room.busy && !room.toggling}
            onClick={room.toggleReady}
          >
            {room.myReady ? tableCopy.notReadyButton : tableCopy.readyButton}
          </ActionButton>
        </Appear>
        <Appear show={waiting && room.role === "host"}>
          <ActionButton
            tone="red"
            icon="play"
            sound="drum"
            disabled={!room.canStart || room.busy}
            working={room.starting}
            workingLabel={label(tableCopy.starting)}
            onClick={room.start}
          >
            {tableCopy.start}
          </ActionButton>
        </Appear>
        <Appear show={waiting && room.freeSeats > 0}>
          <CopyInviteButton
            invite={room.invite}
            unlocking={room.unlockingInvite}
            onPress={room.copyInvite}
          />
        </Appear>
        <Appear show={room.timeUp}>
          <ActionButton
            tone="danger"
            icon="back"
            disabled={room.busy}
            working={room.closing}
            workingLabel={label(tableCopy.closing)}
            onClick={room.close}
          >
            {tableCopy.closeTable}
          </ActionButton>
        </Appear>
        <ActionButton
          tone="quiet"
          icon="back"
          disabled={room.busy && !room.leaving}
          working={room.leaving}
          workingLabel={label(tableCopy.leaving)}
          onClick={room.leave}
        >
          {tableCopy.leave}
        </ActionButton>
      </div>
    </div>
  );
}
