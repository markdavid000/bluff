"use client";

import { cn } from "cn";
import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { CountdownBadge } from "@/components/shared/countdown-badge";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { tableCopy } from "../copy";
import type { useWaitingRoom } from "../hooks/use-waiting-room";
import { seatLayout } from "../lib/seat-layout";
import { useTipsOnFirstVisit } from "../hooks/use-tips-dialog";
import { GameBoard } from "./board/game-board";
import { ComputerSeat } from "./computer-seat";
import { RemoveGuestButton } from "./remove-guest-button";
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
const PHONE = "(max-width: 40rem)";
const OPPONENT_ORDER = ["left", "top", "right"] as const;

export function WaitingRoom({ room }: { room: Room }) {
  useTipsOnFirstVisit();
  const colors = useThemeColors();
  const phone = useMediaQuery(PHONE);
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
  const opponents = OPPONENT_ORDER.flatMap((side) => {
    const index = layout.findIndex((placement) => placement.side === side);
    return index >= 0 ? [index] : [];
  });
  const bottomIndex = layout.findIndex((placement) => placement.side === "bottom");
  const seatAt = (index: number, compact: boolean) => {
    const seat = seats[index];
    return (
      <Appear
        show={seat !== undefined || waiting}
        swapKey={
          seat?.player ?? (room.computerComing ? "computer" : room.computerLeft ? "call" : "open")
        }
      >
        {seat ? (
          <div className={cn("flex flex-col items-center gap-2", compact && "relative")}>
            <SeatBadge
              compact={compact}
              name={seat.name}
              avatarSrc={seat.avatarSrc}
              ready={seat.ready}
              isHost={seat.isHost}
              isMe={seat.isMe}
              isComputer={seat.isComputer}
              updating={seat.isMe && room.toggling}
            />
            {room.canRemove(seat.player) ? (
              <span className={cn(compact && "absolute -top-1 left-1")}>
                <RemoveGuestButton
                  name={seat.name || tableCopy.unnamed}
                  disabled={room.busy}
                  onRemove={() => room.removePlayer(seat.player)}
                  compact={compact}
                />
              </span>
            ) : null}
          </div>
        ) : waiting && room.computerComing ? (
          <ComputerSeat compact={compact} />
        ) : waiting && room.computerLeft ? (
          <ActionButton
            tone="quiet"
            size="small"
            icon="rocket"
            aria-label={tableCopy.callComputerBack}
            onClick={room.callComputer}
            className={compact ? "size-11 min-h-0 rounded-full p-0" : undefined}
          >
            {compact ? null : tableCopy.computer}
          </ActionButton>
        ) : waiting ? (
          <InviteSeat
            onInvite={room.copyInvite}
            waiting={room.invite === "loading"}
            compact={compact}
          />
        ) : null}
      </Appear>
    );
  };

  return (
    <div className="flex max-h-full min-h-0 w-full max-w-4xl flex-1 flex-col items-center gap-4 overflow-hidden px-2 pt-1 pb-4 max-[40rem]:gap-2 max-[40rem]:px-0 max-[40rem]:pb-2">
      {phone ? (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2">
          <div data-testid="opponents" className="flex w-full items-start justify-center gap-2">
            {opponents.map((index) => (
              <div key={index} className="flex w-24 justify-center">
                {seatAt(index, true)}
              </div>
            ))}
          </div>
          <div
            data-board-space
            className="[container-type:size] flex h-full min-h-0 w-full flex-1 items-center justify-center"
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
          {bottomIndex >= 0 ? seatAt(bottomIndex, false) : null}
        </div>
      ) : (
        <div className="grid min-h-0 w-full flex-1 grid-cols-[minmax(5rem,auto)_minmax(0,1fr)_minmax(5rem,auto)] grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-3">
          {layout.map((placement, index) => (
            <div key={placement.side} className={SLOT[placement.side]}>
              {seatAt(index, false)}
            </div>
          ))}
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
      )}
      <div className="flex flex-wrap items-center justify-center gap-4 max-[40rem]:gap-2">
        <p
          role="status"
          aria-live="polite"
          className="text-center font-game text-xl max-[40rem]:text-base"
        >
          <Appear show swapKey={room.timeUp ? tableCopy.timeUp : room.line} inline>
            {room.timeUp ? tableCopy.timeUp : room.line}
          </Appear>
        </p>
        <Appear show={waiting && !room.timeUp}>
          <CountdownBadge label={tableCopy.closesIn} remainingMs={room.timeLeft} />
        </Appear>
      </div>
      <Appear show={room.computerWait !== null} swapKey={room.computerWait ?? ""}>
        <p className="text-center text-sm text-muted-foreground">{room.computerWait}</p>
      </Appear>
      <div className="flex flex-wrap items-center justify-center gap-3 max-[40rem]:gap-2 max-[40rem]:[&>*_button]:min-h-12 max-[40rem]:[&>*_button]:px-5 max-[40rem]:[&>*_button]:py-2 max-[40rem]:[&>*_button]:text-lg">
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
        <Appear show={waiting && room.computerLeft && !room.computerComing}>
          <ActionButton tone="green" icon="rocket" sound="drum" onClick={room.callComputer}>
            {tableCopy.callComputerBack}
          </ActionButton>
        </Appear>
        <Appear show={waiting && room.freeSeats > 0 && !room.computerComing}>
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
          aria-label={tableCopy.leave}
          className="max-[40rem]:min-h-12 max-[40rem]:px-5 max-[40rem]:py-2 max-[40rem]:text-lg"
        >
          <span className="max-[40rem]:hidden">{tableCopy.leave}</span>
          <span className="min-[40rem]:hidden">{tableCopy.leaveShort}</span>
        </ActionButton>
      </div>
    </div>
  );
}
