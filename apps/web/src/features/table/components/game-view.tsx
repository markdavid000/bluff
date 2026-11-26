"use client";

import { useState } from "react";
import { Appear } from "@/components/shared/appear";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { Cowrie } from "@/components/shared/cowrie";
import { GameIcon } from "@/components/shared/game-icon";
import { TileLink } from "@/components/shared/tile-link";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useSoundOn } from "@/hooks/use-sound-on";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatChips } from "@/lib/chips";
import { tableCopy } from "../copy";
import type { useGame } from "../hooks/use-game";
import { useGameBoard } from "../hooks/use-game-board";
import { useGameHistory } from "../hooks/use-round-history";
import { useTurnFocus } from "../hooks/use-turn-focus";
import { seatLayout } from "../lib/seat-layout";
import { BidControl } from "./bid-control";
import { GameBoard } from "./board/game-board";
import { CurrentBid } from "./current-bid";
import { GameSeat } from "./game-seat";
import { GameClock } from "./game-clock";
import { LeaveGameButton } from "./leave-game-button";
import { RoundBadge } from "./round-badge";
import { RoundHistory, RoundHistoryList } from "./round-history";
import { TurnBanner } from "./turn-banner";
import { RevealCard } from "./reveal-card";

type Game = NonNullable<ReturnType<typeof useGame>["view"]>;

const SLOT: Record<"top" | "left" | "right" | "bottom", string> = {
  top: "col-start-2 row-start-1 justify-self-center",
  left: "col-start-1 row-start-2 justify-self-end",
  right: "col-start-3 row-start-2 justify-self-start",
  bottom: "col-start-2 row-start-3 justify-self-center",
};

const POT_STACKS = 6;
const WIDE = "(min-width: 64rem)";
const SMALL = "(max-width: 23rem), (max-height: 44rem)";
const PHONE = "(max-width: 40rem)";
const OPPONENT_ORDER = ["left", "top", "right"] as const;

export function GameView({ game }: { game: Game }) {
  const colors = useThemeColors();
  const { table, seats } = game;
  const wide = useMediaQuery(WIDE);
  const small = useMediaQuery(SMALL);
  const phone = useMediaQuery(PHONE);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [cardUp, setCardUp] = useState(false);
  if (game.reveal !== null && !cardUp) setCardUp(true);
  const history = useGameHistory(table, wide || historyOpen, {
    bid: game.bid,
    bidder: game.bidder,
  });
  useSoundOn("tick", game.myTurn && game.turnLow ? Math.ceil(game.turnLeft / 1000) : null);
  const nameOf = (player: string) => {
    const seat = seats.find((each) => each.player.toLowerCase() === player.toLowerCase());
    return seat?.isMe ? tableCopy.you : seat?.name || tableCopy.unnamed;
  };
  const layout = seatLayout(table.seatCount, Math.max(game.mySeat, 0));
  const taken = layout.slice(0, seats.length);
  const mine = game.mySeat >= 0 ? (taken[game.mySeat] ?? null) : null;
  const { throwState, othersShaking, waitingForDice } = useGameBoard({
    round: game.boardRound,
    faces: game.dice.status === "ready" && game.boardRound === table.round ? game.dice.faces : null,
    placement: game.stillIn ? mine : null,
  });
  const controlsShown =
    game.myTurn &&
    !(waitingForDice && (game.dice.status === "loading" || game.dice.status === "ready"));
  const { actionRef, headingRef, focusAfterReveal } = useTurnFocus(controlsShown);
  const seatAt = (index: number, compact: boolean, tight = false) => {
    const seat = seats[index];
    if (!seat) return null;
    return (
      <GameSeat
        name={seat.name}
        avatarSrc={seat.avatarSrc}
        isMe={seat.isMe}
        isComputer={seat.isComputer}
        dice={seat.dice}
        isActive={seat.isActive}
        isTurn={seat.isTurn}
        turnFraction={game.turnFraction}
        lastBid={seat.lastBid}
        ownDice={seat.isMe ? game.dice : null}
        matching={seat.isMe ? game.matching : null}
        holdDice={game.boardRevealed || cardUp}
        compact={compact}
        tight={tight}
      />
    );
  };
  const opponents = OPPONENT_ORDER.flatMap((side) => {
    const index = layout.findIndex((placement) => placement.side === side);
    return index >= 0 && seats[index] ? [{ index }] : [];
  });
  const bottomIndex = layout.findIndex((placement) => placement.side === "bottom");
  const board = (
    <div className="[container-type:size] flex h-full min-h-0 w-full flex-1 items-center justify-center">
      <div className="relative aspect-square w-[min(100cqw,100cqh)]">
        <GameBoard
          colors={colors}
          seats={taken}
          throwState={throwState}
          chipsEach={table.buyIn > 0n ? POT_STACKS : 0}
          revealed={game.boardRevealed}
          revealedDice={game.revealedDice}
          ownSeat={game.mySeat >= 0 ? game.mySeat : null}
          othersShaking={othersShaking}
          label={tableCopy.boardLabel}
        />
      </div>
    </div>
  );

  return (
    <div className="relative flex max-h-full min-h-0 w-full max-w-[68rem] flex-1 flex-col items-center gap-2 overflow-hidden px-2 pt-1 pb-4">
      <h1 ref={headingRef} tabIndex={-1} className="sr-only">
        {tableCopy.tableName(table.id.toString())}
      </h1>
      <div className="flex w-full items-center justify-between gap-3 pb-1 text-sm max-[40rem]:gap-2 min-[68rem]:pr-8">
        <span className="flex min-w-0 items-center gap-2">
          <RoundBadge
            round={table.round}
            diceInPlay={table.diceInPlay}
            onOpen={wide ? undefined : () => setHistoryOpen(true)}
          />
          <CurrentBid bid={game.bid} bidderName={game.bidderName} />
        </span>
        <span className="flex shrink-0 items-center gap-3 max-[40rem]:gap-2">
          <Appear show={game.clockLeft > 0} inline>
            <GameClock leftMs={game.clockLeft} />
          </Appear>
          {table.buyIn > 0n ? (
            <span className="flex items-center gap-1 font-game">
              <Cowrie size={18} />
              {tableCopy.pot(formatChips(game.pot))}
            </span>
          ) : null}
          {game.watching ? (
            <>
              <span className="flex items-center gap-1.5 rounded-full border-2 border-seat-blue-edge bg-seat-blue px-3 py-1 font-game text-sm whitespace-nowrap text-seat-foreground">
                <GameIcon name="zoom" size={18} />
                {tableCopy.watching}
              </span>
              <TileLink href="/play" tone="quiet" size="small" icon="back">
                {tableCopy.backToLobby}
              </TileLink>
            </>
          ) : (
            <LeaveGameButton
              paid={table.buyIn > 0n}
              leaving={game.leaving}
              leavingLabel={game.confirm ? tableCopy.confirmInWallet : tableCopy.leaving}
              disabled={game.busy && !game.leaving}
              onLeave={game.leave}
            />
          )}
        </span>
      </div>

      <Appear show={wide} className="absolute top-[4.5rem] left-2 z-10">
        <RoundHistory history={history} nameOf={nameOf} />
      </Appear>
      {phone ? (
        <div className="flex min-h-0 w-full flex-1 flex-col items-center gap-2">
          <div data-opponents className="flex w-full items-start justify-center gap-3">
            {opponents.map(({ index }) => (
              <div key={index}>{seatAt(index, true)}</div>
            ))}
          </div>
          {board}
          {bottomIndex >= 0 ? seatAt(bottomIndex, false, true) : null}
        </div>
      ) : (
        <div className="grid min-h-0 w-full max-w-5xl flex-1 grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_minmax(4.5rem,auto)] grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
          {layout.map((placement, index) =>
            seats[index] ? (
              <div key={placement.side} className={SLOT[placement.side]}>
                {seatAt(index, false)}
              </div>
            ) : null
          )}
          <div className="col-start-2 row-start-2 flex h-full min-h-0">{board}</div>
        </div>
      )}
      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent>
          <PatternFrame roomy>
            <div className="flex max-h-[70dvh] flex-col gap-4">
              <DialogTitle>{tableCopy.history}</DialogTitle>
              <div className="min-h-0 overflow-y-auto pr-1 text-sm">
                <RoundHistoryList history={history} nameOf={nameOf} />
              </div>
            </div>
          </PatternFrame>
        </DialogContent>
      </Dialog>

      <span role="alert" className="sr-only">
        {game.myTurn && game.turnLow ? tableCopy.timeLow : ""}
      </span>
      <TurnBanner line={table.status === "playing" ? game.line : null} quiet={game.myTurn} />
      <Appear show={controlsShown}>
        <BidControl
          actionRef={actionRef}
          compact={small || phone}
          choice={game.choice}
          bid={game.bid}
          bidderName={game.bidderName}
          placing={game.placing}
          calling={game.calling}
          confirm={game.confirm}
          busy={game.busy}
          onRaise={game.placeBid}
          onCall={game.callBluff}
        />
      </Appear>
      <RevealCard
        reveal={game.reveal}
        onContinue={game.dismissReveal}
        onGone={(event) => {
          focusAfterReveal(event);
          setCardUp(false);
        }}
      />
    </div>
  );
}
