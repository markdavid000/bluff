import type { TableStatus } from "@bluff/game";

export interface NewTable {
  id: bigint;
  host: string;
  status: TableStatus;
  seatCount: number;
  seatsTaken: number;
  buyIn: bigint;
  isPrivate: boolean;
  createdAt: number;
}

export interface LastGame {
  id: bigint;
  seatCount: number;
  buyIn: bigint;
  startedAt: number;
  players: readonly string[];
}

export interface NewTableOffer {
  id: bigint;
  host: string;
  buyIn: bigint;
  isPrivate: boolean;
}

function same(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function newTableOffer(tables: readonly NewTable[], last: LastGame): NewTableOffer | null {
  const match = tables.find(
    (table) =>
      table.id !== last.id &&
      table.status === "waiting" &&
      table.seatCount === last.seatCount &&
      table.buyIn === last.buyIn &&
      table.seatsTaken < table.seatCount &&
      table.createdAt > last.startedAt &&
      last.players.some((player) => same(player, table.host))
  );
  return match
    ? { id: match.id, host: match.host, buyIn: match.buyIn, isPrivate: match.isPrivate }
    : null;
}
