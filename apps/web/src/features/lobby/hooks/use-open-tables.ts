"use client";

import { bluffAbi } from "@bluff/contracts";
import { usePublicClient, useReadContract } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { MoveNotReadyError } from "@/lib/errors";
import { type LobbyTable, openSeats, toLobbyTable } from "../lib/tables";

const LISTED = 24n;
const REFRESH_MS = 6_000;
const OPEN_TABLES = {
  address: contracts.bluff,
  abi: bluffAbi,
  functionName: "openTables",
  args: [0n, LISTED],
} as const;

export type OpenTables =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; tables: LobbyTable[] };

function stillOpen(listed: Parameters<typeof toLobbyTable>[0][]): LobbyTable[] {
  return listed.map(toLobbyTable).filter((table) => table.waiting && openSeats(table) > 0);
}

export function useOpenTables(): OpenTables {
  const listed = useReadContract({ ...OPEN_TABLES, query: { refetchInterval: REFRESH_MS } });

  if (listed.data) return { status: "ready", tables: stillOpen([...listed.data]) };
  if (listed.isError) return { status: "failed", retry: () => void listed.refetch() };
  return { status: "loading" };
}

export function useLatestOpenTables(): () => Promise<LobbyTable[]> {
  const client = usePublicClient({ chainId: gameChain.id });
  return async () => {
    if (!client) throw new MoveNotReadyError();
    return stillOpen([...(await client.readContract(OPEN_TABLES))]);
  };
}
