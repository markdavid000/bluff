import { Cowrie } from "@/components/shared/cowrie";
import { TileLink } from "@/components/shared/tile-link";
import { lobbyCopy } from "../copy";
import type { LiveGame } from "../lib/live-games";
import { buyInLabel } from "./buy-in-picker";
import { SeatDots } from "./seat-dots";

export function LiveGameCard({ game }: { game: LiveGame }) {
  const name = lobbyCopy.tableName(game.id.toString());
  return (
    <li className="flex flex-col gap-3 rounded-2xl border-2 border-tile-edge/40 bg-card p-4 shadow-[0_5px_0_0_var(--color-tile-edge)]">
      <div className="flex items-center justify-between gap-3">
        <span className="font-game text-lg">{name}</span>
        <span className="flex items-center gap-1 font-game text-base">
          {game.buyIn === 0n ? null : <Cowrie size={20} />}
          {buyInLabel(game.buyIn)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
        <SeatDots players={game.players} seats={game.seatCount} />
        <span className="font-game text-foreground">{lobbyCopy.roundOf(game.round)}</span>
        <span>{lobbyCopy.diceInPlay(game.diceInPlay)}</span>
        {game.hasComputer ? (
          <span className="rounded-full border-2 border-seat-blue-edge bg-seat-blue px-2 font-game text-xs text-seat-foreground">
            {lobbyCopy.computerPlaying}
          </span>
        ) : null}
      </div>
      <TileLink
        href={`/table/${game.id}`}
        tone="green"
        size="small"
        icon="zoom"
        label={`${lobbyCopy.watch} ${name}`}
        className="self-end"
      >
        {lobbyCopy.watch}
      </TileLink>
    </li>
  );
}
