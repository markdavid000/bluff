import { ActionButton } from "@/components/shared/action-button";
import { Avatar } from "@/components/shared/avatar";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { formatChips } from "@/lib/chips";
import { tableCopy } from "../../copy";
import type { HistoryGame } from "../../lib/game-log";
import { potOf, shareOf } from "../../lib/payout";
import { chipsLabel, startedLabel } from "./past-game-labels";

export function PastGameDialog({
  game,
  nameOf,
  faceOf,
  onClose,
}: {
  game: HistoryGame | null;
  nameOf: (address: string) => string;
  faceOf: (address: string) => string | undefined;
  onClose: () => void;
}) {
  return (
    <Dialog open={game !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-lg">
        {game ? <Details game={game} nameOf={nameOf} faceOf={faceOf} /> : null}
      </DialogContent>
    </Dialog>
  );
}

function Details({
  game,
  nameOf,
  faceOf,
}: {
  game: HistoryGame;
  nameOf: (address: string) => string;
  faceOf: (address: string) => string | undefined;
}) {
  const { table, outcome, reason } = game;
  const pot = potOf(table.buyIn, table.seats.length);
  const winners = outcome.winners;
  const chips = chipsLabel(outcome.chips);
  return (
    <PatternFrame>
      <div className="flex flex-col gap-5">
        <div className="flex items-center justify-between gap-4">
          <DialogTitle>{tableCopy.tableName(table.id.toString())}</DialogTitle>
          <DialogClose asChild>
            <ActionButton tone="quiet" size="small" icon="back">
              {tableCopy.pastClose}
            </ActionButton>
          </DialogClose>
        </div>
        <p className="font-game text-xl">
          {tableCopy.pastSummary(tableCopy.pastResult[outcome.result], chips)}
        </p>
        <ul className="flex flex-col gap-2">
          {table.seats.map((seat) => {
            const face = faceOf(seat.player);
            return (
              <li key={seat.player} className="flex items-center gap-3">
                {face ? (
                  <Avatar src={face} size={36} />
                ) : (
                  <span className="size-9 rounded-full border-2 border-tile-edge bg-muted" />
                )}
                <span className="flex-1 font-game text-base">{nameOf(seat.player)}</span>
                <span className="text-sm text-muted-foreground">
                  {tableCopy.pastDiceLeft(seat.dice)}
                </span>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-col gap-1 text-sm">
          {reason ? <p>{tableCopy.pastHowItEnded(tableCopy.pastEndedBy[reason])}</p> : null}
          {winners.length > 0 ? (
            <p>{tableCopy.pastWonBy(winners.map((winner) => nameOf(winner)).join(", "))}</p>
          ) : null}
        </div>
        <p className="text-sm text-muted-foreground">
          {tableCopy.pastWhen(startedLabel(table.startedAt), tableCopy.pastRounds(table.round))}
        </p>
        {pot > 0n && winners.length > 0 ? (
          <div className="flex flex-col gap-1 text-sm">
            <p>{tableCopy.pastPot(formatChips(pot))}</p>
            {winners.map((winner) => {
              const share = shareOf(pot, winners, winner);
              return share === null ? null : (
                <p key={winner}>{tableCopy.pastShare(nameOf(winner), formatChips(share))}</p>
              );
            })}
          </div>
        ) : null}
      </div>
    </PatternFrame>
  );
}
