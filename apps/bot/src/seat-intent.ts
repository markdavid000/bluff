import { COMPUTER_WAIT_MS, type KeeperAction, type Table, keeperDuty } from "@bluff/game";

export type SeatIntent =
  | { kind: "done" }
  | { kind: "ready" }
  | { kind: "leave"; reason: "alone" | "not-started" }
  | { kind: "turn"; deadline: number }
  | { kind: "keep"; action: KeeperAction; dueAt: number }
  | { kind: "wait" };

function same(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function seatIntent(
  table: Table,
  me: string,
  nowMs: number,
  seatedAtMs: number
): SeatIntent {
  const mine = table.seats.find((seat) => same(seat.player, me));
  if (!mine || table.status === "finished" || table.status === "cancelled") return { kind: "done" };
  if (table.status === "waiting") {
    if (table.seats.length < 2) return { kind: "leave", reason: "alone" };
    if (nowMs - seatedAtMs >= COMPUTER_WAIT_MS) return { kind: "leave", reason: "not-started" };
    if (!mine.ready) return { kind: "ready" };
    return { kind: "wait" };
  }
  const onTurn = table.seats[table.turn];
  if (
    table.status === "playing" &&
    mine.isActive &&
    onTurn !== undefined &&
    same(onTurn.player, me) &&
    nowMs <= table.deadline
  ) {
    return { kind: "turn", deadline: table.deadline };
  }
  const duty = keeperDuty(table, nowMs, me);
  if (duty) return { kind: "keep", action: duty.action, dueAt: duty.dueAt };
  return { kind: "wait" };
}
