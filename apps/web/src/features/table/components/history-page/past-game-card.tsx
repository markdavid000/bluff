import { Avatar } from "@/components/shared/avatar";
import { Cowrie } from "@/components/shared/cowrie";
import { formatChips } from "@/lib/chips";
import { cn } from "cn";
import { tableCopy } from "../../copy";
import type { HistoryGame } from "../../lib/game-log";
import { chipsLabel, RESULT_TONE, startedLabel } from "./past-game-labels";

export function PastGameCard({
  game,
  faceOf,
  onOpen,
}: {
  game: HistoryGame;
  faceOf: (address: string) => string | undefined;
  onOpen: () => void;
}) {
  const { table, outcome } = game;
  const name = tableCopy.tableName(table.id.toString());
  const chips = chipsLabel(outcome.chips);
  return (
    <li>
      <button
        type="button"
        aria-label={tableCopy.pastOpen(name)}
        onClick={onOpen}
        className="flex w-full flex-col gap-3 rounded-2xl border-2 border-tile-edge/40 bg-card p-4 text-left shadow-[0_5px_0_0_var(--color-tile-edge)] transition-[translate,box-shadow] hover:brightness-105 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none active:translate-y-1 active:shadow-[0_1px_0_0_var(--color-tile-edge)] calm:transition-none"
      >
        <span className="flex items-center justify-between gap-3">
          <span className="font-game text-lg">{name}</span>
          <span
            className={cn(
              "rounded-full px-3 py-0.5 font-game text-sm",
              RESULT_TONE[outcome.result]
            )}
          >
            {tableCopy.pastResult[outcome.result]}
          </span>
        </span>
        <span className="text-sm text-muted-foreground">{startedLabel(table.startedAt)}</span>
        <span className="flex items-center justify-between gap-3">
          <span className="flex -space-x-2">
            {table.seats.map((seat) => {
              const face = faceOf(seat.player);
              return face ? (
                <Avatar key={seat.player} src={face} size={32} />
              ) : (
                <span
                  key={seat.player}
                  className="size-8 rounded-full border-2 border-tile-edge bg-muted"
                />
              );
            })}
          </span>
          <span className="flex items-center gap-1 font-game text-base">
            {table.buyIn === 0n ? null : <Cowrie size={18} />}
            {chips ??
              (table.buyIn === 0n
                ? tableCopy.free
                : tableCopy.chipsToPlay(formatChips(table.buyIn)))}
          </span>
        </span>
      </button>
    </li>
  );
}
