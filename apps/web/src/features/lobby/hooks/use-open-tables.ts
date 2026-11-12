"use client";

import { bluffAbi } from "@bluff/contracts";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { type LobbyTable, openSeats, toLobbyTable } from "../lib/tables";

const LISTED = 24n;
const REFRESH_MS = 6_000;

export type OpenTables =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; tables: LobbyTable[] };

export function useOpenTables(): OpenTables {
  const listed = useReadContract({
    address: contracts.bluff,
    abi: bluffAbi,
    functionName: "openTables",
    args: [0n, LISTED],
    query: { refetchInterval: REFRESH_MS },
  });

  if (listed.data) {
    const tables = listed.data
      .map(toLobbyTable)
      .filter((table) => table.waiting && openSeats(table) > 0);
    return { status: "ready", tables };
  }
  if (listed.isError) return { status: "failed", retry: () => void listed.refetch() };
  return { status: "loading" };
}
