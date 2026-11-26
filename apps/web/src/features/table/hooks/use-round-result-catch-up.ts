"use client";

import { bluffAbi } from "@bluff/contracts";
import { useQuery } from "@tanstack/react-query";
import { contracts, gameClient } from "@/config/chain";
import { type RoundResult, toRoundResult } from "./use-table-events";

const CHECK_EVERY_MS = 5_000;

export function useRoundResultCatchUp({
  id,
  round,
  fromBlock,
  wanted,
}: {
  id: bigint;
  round: number;
  fromBlock: bigint;
  wanted: boolean;
}): RoundResult | null {
  const read = useQuery({
    queryKey: ["table", "round-result", id.toString(), round, fromBlock.toString()],
    enabled: wanted && fromBlock > 0n,
    refetchInterval: (query) => (query.state.data ? false : CHECK_EVERY_MS),
    queryFn: async () => {
      const logs = await gameClient.getContractEvents({
        address: contracts.bluff,
        abi: bluffAbi,
        eventName: "RoundSettled",
        args: { id },
        fromBlock,
      });
      for (const log of logs) {
        const result = toRoundResult(log.args);
        if (result?.round === round) return result;
      }
      return null;
    },
  });
  return wanted && !read.isPlaceholderData ? (read.data ?? null) : null;
}
