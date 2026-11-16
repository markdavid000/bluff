"use client";

import { Appear } from "@/components/shared/appear";
import { Cowrie } from "@/components/shared/cowrie";
import { useMediaQuery } from "@/hooks/use-media-query";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { formatChips } from "@/lib/chips";
import { tableCopy } from "../copy";
import type { useGame } from "../hooks/use-game";
import { useGameBoard } from "../hooks/use-game-board";
import { useGameHistory } from "../hooks/use-round-history";
import { seatLayout } from "../lib/seat-layout";
import { BidControl } from "./bid-control";
import { GameBoard } from "./board/game-board";
import { CurrentBid } from "./current-bid";
import { GameSeat } from "./game-seat";
import { GameClock } from "./game-clock";
import { LeaveGameButton } from "./leave-game-button";
import { RoundBadge } from "./round-badge";
import { RoundHistory } from "./round-history";
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

export function GameView({ game }: { game: Game }) {
  const colors = useThemeColors();
  const { table, seats } = game;
  const wide = useMediaQuery(WIDE);
  const history = useGameHistory(table, wide);
  const nameOf = (player: string) => {
    const seat = seats.find((each) => each.player.toLowerCase() === player.toLowerCase());
    return seat?.isMe ? tableCopy.you : (seat?.name ?? tableCopy.unnamed);
  };
  const layout = seatLayout(table.seatCount, Math.max(game.mySeat, 0));
  const taken = layout.slice(0, seats.length);
  const mine = game.mySeat >= 0 ? (taken[game.mySeat] ?? null) : null;
  const { throwState, othersShaking, waitingForDice } = useGameBoard({
    round: game.boardRound,
    faces: game.dice.status === "ready" && game.boardRound === table.round ? game.dice.faces : null,
    placement: game.stillIn ? mine : null,
  });

  return (
    <div className="relative flex max-h-full min-h-0 w-full max-w-[68rem] flex-1 flex-col items-center gap-2 overflow-hidden px-2 pt-1 pb-4">
      <div className="flex w-full items-center justify-between gap-3 pb-1 text-sm min-[68rem]:pr-8">
        <span className="flex min-w-0 items-center gap-2">
          <RoundBadge round={table.round} diceInPlay={table.diceInPlay} />
          <CurrentBid bid={game.bid} bidderName={game.bidderName} />
        </span>
        <span className="flex shrink-0 items-center gap-3">
          <Appear show={game.clockLeft > 0} inline>
            <GameClock leftMs={game.clockLeft} />
          </Appear>
          {table.buyIn > 0n ? (
            <span className="flex items-center gap-1 font-game">
              <Cowrie size={18} />
              {tableCopy.pot(formatChips(game.pot))}
            </span>
          ) : null}
          <LeaveGameButton
            paid={table.buyIn > 0n}
            leaving={game.leaving}
            leavingLabel={game.confirm ? tableCopy.confirmInWallet : tableCopy.leaving}
            disabled={game.busy && !game.leaving}
            onLeave={game.leave}
          />
        </span>
      </div>

      <Appear show={wide} className="absolute top-[4.5rem] left-2 z-10">
        <RoundHistory history={history} nameOf={nameOf} />
      </Appear>
      <div className="grid min-h-0 w-full max-w-5xl flex-1 grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_minmax(4.5rem,auto)] grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1">
        {layout.map((placement, index) => {
          const seat = seats[index];
          return seat ? (
            <div key={placement.side} className={SLOT[placement.side]}>
              <GameSeat
                name={seat.name}
                avatarSrc={seat.avatarSrc}
                isMe={seat.isMe}
                dice={seat.dice}
                isActive={seat.isActive}
                isTurn={seat.isTurn}
                turnFraction={game.turnFraction}
                lastBid={seat.lastBid}
                ownDice={seat.isMe ? game.dice : null}
                matching={seat.isMe ? game.matching : null}
                holdDice={game.boardRevealed}
              />
            </div>
          ) : null;
        })}
        <div className="[container-type:size] col-start-2 row-start-2 flex h-full min-h-0 items-center justify-center">
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
      </div>

      <span role="alert" className="sr-only">
        {game.myTurn && game.turnLow ? tableCopy.timeLow : ""}
      </span>
      <TurnBanner line={table.status === "playing" ? game.line : null} quiet={game.myTurn} />
      <Appear show={game.myTurn && !(waitingForDice && game.dice.status !== "failed")}>
        <BidControl
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
      <RevealCard reveal={game.reveal} onContinue={game.dismissReveal} />
    </div>
  );
}
