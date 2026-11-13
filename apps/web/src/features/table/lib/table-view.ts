import type { bluffAbi } from "@bluff/contracts";
import type { Address, ContractFunctionReturnType } from "viem";

type TableRead = ContractFunctionReturnType<typeof bluffAbi, "view", "getTable">;

export type TableView = TableRead[0];
export type SeatView = TableRead[1][number];

export type TableStatus =
  "waiting" | "verifying" | "playing" | "revealing" | "finished" | "cancelled";

const STATUSES: Record<number, TableStatus> = {
  1: "waiting",
  2: "verifying",
  3: "playing",
  4: "revealing",
  5: "finished",
  6: "cancelled",
};

export interface Seat {
  player: Address;
  ready: boolean;
  isHost: boolean;
  isActive: boolean;
}

export interface Table {
  id: bigint;
  host: Address;
  status: TableStatus;
  isPrivate: boolean;
  seatCount: number;
  buyIn: bigint;
  deadline: number;
  seats: Seat[];
}

export function toTable(view: TableView, seats: readonly SeatView[]): Table {
  const status = STATUSES[view.status];
  if (!status) throw new Error(`Table ${view.id} has an unknown status ${view.status}.`);
  return {
    id: view.id,
    host: view.host,
    status,
    isPrivate: view.isPrivate,
    seatCount: view.seatCount,
    buyIn: view.buyIn,
    deadline: Number(view.deadline) * 1000,
    seats: seats.map((seat) => ({
      player: seat.player,
      ready: seat.ready,
      isHost: seat.player.toLowerCase() === view.host.toLowerCase(),
      isActive: seat.isActive,
    })),
  };
}

export function freeSeats(table: Table): number {
  return table.seatCount - table.seats.length;
}

export function notReady(table: Table): Seat[] {
  return table.seats.filter((seat) => !seat.isHost && !seat.ready);
}
