import type { Table } from "./table-view";

export const KEEPER_STAGGER_MS = 8_000;
const MIN_PLAYERS = 2;
const CHECK_LIMIT_MS = 10 * 60 * 1000;

export type KeeperAction = "confirmSeats" | "cancelVerification" | "cancelTable";

export interface KeeperDuty {
  action: KeeperAction;
  dueAt: number;
}

function keeperPosition(table: Table, me: string): number | null {
  const ordered = [...table.seats].sort((a, b) => Number(b.isHost) - Number(a.isHost));
  const index = ordered.findIndex((seat) => seat.player.toLowerCase() === me.toLowerCase());
  return index === -1 ? null : index;
}

export function keeperDuty(table: Table, now: number, me: string | undefined): KeeperDuty | null {
  if (!me) return null;
  const position = keeperPosition(table, me);
  if (position === null) return null;
  const stagger = position * KEEPER_STAGGER_MS;
  const deadlinePassed = now > table.deadline;
  if (table.status === "verifying") {
    return deadlinePassed
      ? { action: "cancelVerification", dueAt: table.deadline + stagger }
      : { action: "confirmSeats", dueAt: table.deadline - CHECK_LIMIT_MS + stagger };
  }
  if (table.status === "waiting" && deadlinePassed && table.seats.length < MIN_PLAYERS) {
    return { action: "cancelTable", dueAt: table.deadline + stagger };
  }
  return null;
}
