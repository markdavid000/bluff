import type { bluffAbi } from "@bluff/contracts";
import type { Address, ContractFunctionReturnType } from "viem";
import { type Bid, isValidFace } from "@/lib/bid-rules";

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
  dice: number;
  missedTurns: number;
}

interface TableBid extends Bid {
  bidder: number;
}

export interface Table {
  id: bigint;
  host: Address;
  status: TableStatus;
  isPrivate: boolean;
  seatCount: TableSize;
  buyIn: bigint;
  deadline: number;
  dicePerPlayer: number;
  diceInPlay: number;
  startedAt: number;
  round: number;
  turn: number;
  roundStarter: number;
  bid: TableBid | null;
  caller: number | null;
  seats: Seat[];
}

export type TableSize = 2 | 3 | 4;

function isTableSize(value: number): value is TableSize {
  return value === 2 || value === 3 || value === 4;
}

function bidOf(view: TableView): TableBid | null {
  if (view.bidQuantity === 0) return null;
  if (!isValidFace(view.bidFace)) {
    throw new Error(
      `Table ${view.id} has a bid on face ${view.bidFace}, which the game never allows.`
    );
  }
  return { quantity: view.bidQuantity, face: view.bidFace, bidder: view.bidder };
}

export function toTable(view: TableView, seats: readonly SeatView[]): Table {
  const status = STATUSES[view.status];
  if (!status) throw new Error(`Table ${view.id} has an unknown status ${view.status}.`);
  if (!isTableSize(view.seatCount)) {
    throw new Error(`Table ${view.id} has ${view.seatCount} seats, which the game never allows.`);
  }
  const seatCount = view.seatCount;
  return {
    id: view.id,
    host: view.host,
    status,
    isPrivate: view.isPrivate,
    seatCount,
    buyIn: view.buyIn,
    deadline: Number(view.deadline) * 1000,
    dicePerPlayer: view.dicePerPlayer,
    diceInPlay: view.diceInPlay,
    startedAt: Number(view.startedAt) * 1000,
    round: view.round,
    turn: view.turn,
    roundStarter: view.roundStarter,
    bid: bidOf(view),
    caller: status === "revealing" ? view.caller : null,
    seats: seats.map((seat) => ({
      player: seat.player,
      ready: seat.ready,
      isHost: seat.player.toLowerCase() === view.host.toLowerCase(),
      isActive: seat.isActive,
      dice: seat.dice,
      missedTurns: seat.missedTurns,
    })),
  };
}

export function freeSeats(table: Table): number {
  return table.seatCount - table.seats.length;
}

export function notReady(table: Table): Seat[] {
  return table.seats.filter((seat) => !seat.isHost && !seat.ready);
}
