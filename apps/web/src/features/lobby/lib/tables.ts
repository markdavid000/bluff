import type { bluffAbi } from "@bluff/contracts";
import { type Address, type ContractFunctionReturnType, type Hex, encodeAbiParameters } from "viem";
import { ONE_CHIP, formatChips } from "@/lib/chips";
import { lobbyCopy } from "../copy";

export type TableView = ContractFunctionReturnType<typeof bluffAbi, "view", "openTables">[number];

export const BUY_INS = [0n, 10n * ONE_CHIP, 25n * ONE_CHIP, 50n * ONE_CHIP] as const;
export const SEAT_COUNTS = [2, 3, 4] as const;
export type SeatCount = (typeof SEAT_COUNTS)[number];

const WAITING = 1;
const CREATE = 0;
const JOIN = 1;

export interface LobbyTable {
  id: bigint;
  host: Address;
  waiting: boolean;
  isPrivate: boolean;
  seatCount: number;
  playerCount: number;
  buyIn: bigint;
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
    closesAt: Number(view.deadline) * 1000,
  };
}

export function openSeats(table: LobbyTable): number {
  return table.seatCount - table.playerCount;
}

export type JoinRequest =
  | { kind: "create"; seatCount: number; buyIn: bigint; isPrivate: boolean }
  | { kind: "join"; tableId: bigint };

const JOIN_REQUEST = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "uint8" },
  { type: "uint64" },
  { type: "bool" },
] as const;

export function joinRequestData(request: JoinRequest): Hex {
  return request.kind === "create"
    ? encodeAbiParameters(JOIN_REQUEST, [
        CREATE,
        0n,
        request.seatCount,
        request.buyIn,
        request.isPrivate,
      ])
    : encodeAbiParameters(JOIN_REQUEST, [JOIN, request.tableId, 0, 0n, false]);
}

export function inviteLink(origin: string, id: bigint): string {
  return `${origin}/play?join=${id}`;
}

const TABLE_NUMBER = /^#?(\d{1,18})$/;

function positiveId(text: string | null): bigint | null {
  if (!text) return null;
  const match = TABLE_NUMBER.exec(text.trim());
  if (!match?.[1]) return null;
  const id = BigInt(match[1]);
  return id > 0n ? id : null;
}

export function parseTableLink(input: string): bigint | null {
  const text = input.trim();
  const direct = positiveId(text);
  if (direct !== null) return direct;
  if (!text.includes("join=")) return null;
  const query = text.slice(text.indexOf("?"));
  return positiveId(new URLSearchParams(query).get("join"));
}

export type KnownBalance = { status: "ready"; amount: bigint } | { status: "unknown" };

export function affordProblem(buyIn: bigint, balance: KnownBalance): string | null {
  if (buyIn === 0n) return null;
  if (balance.status !== "ready") return lobbyCopy.showChipsFirst;
  return balance.amount >= buyIn ? null : lobbyCopy.notEnough(formatChips(buyIn));
}
