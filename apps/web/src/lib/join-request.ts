import { type Hex, encodeAbiParameters } from "viem";

const CREATE = 0;
const JOIN = 1;

const JOIN_REQUEST = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "uint8" },
  { type: "uint64" },
  { type: "bool" },
] as const;

export type JoinRequest =
  | { kind: "create"; seatCount: number; buyIn: bigint; isPrivate: boolean }
  | { kind: "join"; tableId: bigint };

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
