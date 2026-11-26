import type { bluffAbi } from "@bluff/contracts";
import type { Address, ContractFunctionReturnType } from "viem";
import { type KnownBalance, ONE_CHIP, formatChips, whyUnaffordable } from "@/lib/chips";
import { isComputerPlayer } from "@/lib/computer-players";
import { lobbyCopy } from "../copy";

export type TableView = ContractFunctionReturnType<typeof bluffAbi, "view", "openTables">[number];

export const BUY_INS = [0n, 10n * ONE_CHIP, 25n * ONE_CHIP, 50n * ONE_CHIP] as const;
export const SEAT_COUNTS = [2, 3, 4] as const;
export type SeatCount = (typeof SEAT_COUNTS)[number];

const WAITING = 1;
const CLOSING_SOON_MS = 60_000;

export interface LobbyTable {
  id: bigint;
  host: Address;
  waiting: boolean;
  isPrivate: boolean;
  seatCount: number;
  playerCount: number;
  buyIn: bigint;
  createdAt: number;
  closesAt: number;
}

export function toLobbyTable(view: TableView): LobbyTable {
  return {
    id: view.id,
    host: view.host,
    waiting: view.status === WAITING,
    isPrivate: view.isPrivate,
    seatCount: view.seatCount,
    playerCount: view.playerCount,
    buyIn: view.buyIn,
    createdAt: Number(view.createdAt) * 1000,
    closesAt: Number(view.deadline) * 1000,
  };
}

export function peopleTables(tables: LobbyTable[]): LobbyTable[] {
  return tables.filter((table) => !isComputerPlayer(table.host));
}

export function othersTables(tables: LobbyTable[], me: string | undefined): LobbyTable[] {
  if (me === undefined) return tables;
  const mine = me.toLowerCase();
  return tables.filter((table) => table.host.toLowerCase() !== mine);
}

export function openSeats(table: LobbyTable): number {
  return table.seatCount - table.playerCount;
}

export function joinable(table: LobbyTable, now: number): boolean {
  return table.waiting && openSeats(table) > 0 && table.closesAt - now > CLOSING_SOON_MS;
}

export function affordProblem(buyIn: bigint, balance: KnownBalance): string | null {
  const reason = whyUnaffordable(buyIn, balance);
  if (reason === "show-chips") return lobbyCopy.showChipsFirst;
  if (reason === "too-few") return lobbyCopy.notEnough(formatChips(buyIn));
  return null;
}
