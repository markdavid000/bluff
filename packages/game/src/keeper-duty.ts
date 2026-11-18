import type { Seat, Table } from "./table-view";

export const KEEPER_STAGGER_MS = 8_000;
export const CHAIN_LAG_MS = 15_000;
const MIN_PLAYERS = 2;
const CHECK_LIMIT_MS = 10 * 60 * 1000;
const STUCK_REVEAL_LIMIT_MS = 10 * 60 * 1000;

export type KeeperAction =
  | "confirmSeats"
  | "cancelVerification"
  | "cancelTable"
  | "settleReveal"
  | "cancelStuckReveal"
  | "claimTimeout";

export interface KeeperDuty {
  action: KeeperAction;
  dueAt: number;
}

function inGame(table: Table): boolean {
  return table.status === "playing" || table.status === "revealing";
}

function keeperOrder(table: Table): Seat[] {
  if (inGame(table)) {
    return [
      ...table.seats.filter((seat) => seat.isActive),
      ...table.seats.filter((seat) => !seat.isActive),
    ];
  }
  return [...table.seats].sort((a, b) => Number(b.isHost) - Number(a.isHost));
}

function keeperPosition(table: Table, me: string): number | null {
  const index = keeperOrder(table).findIndex(
    (seat) => seat.player.toLowerCase() === me.toLowerCase()
  );
  return index === -1 ? null : index;
}

export function keeperDuty(table: Table, now: number, me: string | undefined): KeeperDuty | null {
  if (!me) return null;
  const position = keeperPosition(table, me);
  if (position === null) return null;
  const stagger = position * KEEPER_STAGGER_MS;
  const lateBy = table.deadline + CHAIN_LAG_MS;
  const deadlinePassed = now > lateBy;
  if (table.status === "verifying") {
    return deadlinePassed
      ? { action: "cancelVerification", dueAt: lateBy + stagger }
      : { action: "confirmSeats", dueAt: table.deadline - CHECK_LIMIT_MS + stagger };
  }
  if (table.status === "revealing") {
    return deadlinePassed
      ? { action: "cancelStuckReveal", dueAt: lateBy + stagger }
      : { action: "settleReveal", dueAt: table.deadline - STUCK_REVEAL_LIMIT_MS + stagger };
  }
  if (table.status === "playing" && deadlinePassed) {
    return { action: "claimTimeout", dueAt: lateBy + stagger };
  }
  if (table.status === "waiting" && deadlinePassed && table.seats.length < MIN_PLAYERS) {
    return { action: "cancelTable", dueAt: lateBy + stagger };
  }
  return null;
}
