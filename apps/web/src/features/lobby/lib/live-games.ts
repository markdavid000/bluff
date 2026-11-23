import type { Table } from "@bluff/game";
import { isComputerPlayer } from "@/lib/computer-players";

export interface LiveGame {
  id: bigint;
  seatCount: number;
  players: number;
  round: number;
  diceInPlay: number;
  buyIn: bigint;
  hasComputer: boolean;
}

const IN_PLAY = new Set<Table["status"]>(["playing", "revealing"]);

export function liveGames(tables: readonly Table[], me: string | undefined): LiveGame[] {
  const mine = me?.toLowerCase();
  const seen = new Set<bigint>();
  return tables
    .filter((table) => {
      if (seen.has(table.id)) return false;
      seen.add(table.id);
      return (
        IN_PLAY.has(table.status) &&
        !table.isPrivate &&
        !table.seats.some((seat) => seat.player.toLowerCase() === mine)
      );
    })
    .map((table) => ({
      id: table.id,
      seatCount: table.seatCount,
      players: table.seats.length,
      round: table.round,
      diceInPlay: table.diceInPlay,
      buyIn: table.buyIn,
      hasComputer: table.seats.some((seat) => isComputerPlayer(seat.player)),
    }));
}
