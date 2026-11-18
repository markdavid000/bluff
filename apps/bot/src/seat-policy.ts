import type { Table } from "@bluff/game";

export const MIN_TIME_LEFT_MS = 60_000;
const QUICK_GAME_SEATS = 2;

export type SeatRefusal =
  "not-waiting" | "not-free" | "private" | "wrong-size" | "full" | "too-old";

export function seatRefusal(table: Table, nowMs: number): SeatRefusal | null {
  if (table.status !== "waiting") return "not-waiting";
  if (table.buyIn !== 0n) return "not-free";
  if (table.isPrivate) return "private";
  if (table.seatCount !== QUICK_GAME_SEATS) return "wrong-size";
  if (table.seats.length !== 1) return "full";
  if (table.deadline - nowMs < MIN_TIME_LEFT_MS) return "too-old";
  return null;
}
