"use client";

import { bluffAbi } from "@bluff/contracts";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { type LobbyTable, toLobbyTable } from "../lib/tables";

const REFRESH_MS = 6_000;

interface SeatedTable {
  table: LobbyTable;
  players: Address[];
  status: number;
}

export type TableRead =
  | { status: "none" }
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; seated: SeatedTable };

export function useTable(id: bigint | null): TableRead {
  const read = useReadContract({
    address: contracts.bluff,
    abi: bluffAbi,
    functionName: "getTable",
    args: id === null ? undefined : [id],
    query: { enabled: id !== null, refetchInterval: REFRESH_MS },
  });

  if (id === null) return { status: "none" };
  if (read.data) {
    const [view, seats] = read.data;
    return {
      status: "ready",
      seated: {
        table: toLobbyTable(view),
        players: seats.filter((seat) => seat.isActive).map((seat) => seat.player),
        status: view.status,
      },
    };
  }
  if (read.isError) return { status: "failed", retry: () => void read.refetch() };
  return { status: "loading" };
}
