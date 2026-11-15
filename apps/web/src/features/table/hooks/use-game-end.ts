"use client";

import { bluffAbi } from "@bluff/contracts";
import { useQuery } from "@tanstack/react-query";
import { getAbiItem } from "viem";
import { contracts, historyClient } from "@/config/chain";
import { type GameEnding, toGameEnding } from "../lib/game-end";

const RECENT_BLOCKS = 9_000n;
const CATCH_UP_ATTEMPTS = 20;
const CATCH_UP_DELAY_MS = 1_500;
const gameEnded = getAbiItem({ abi: bluffAbi, name: "GameEnded" });

class HistoryBehind extends Error {}

export type GameEnd =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "unknown" }
  | ({ status: "ready" } & GameEnding);

async function readEnd(id: bigint, seenAt: bigint): Promise<GameEnding | null> {
  const head = await historyClient.getBlockNumber();
  if (head < seenAt) throw new HistoryBehind();
  const logs = await historyClient.getLogs({
    address: contracts.bluff,
    event: gameEnded,
    args: { id },
    fromBlock: head > RECENT_BLOCKS ? head - RECENT_BLOCKS : 0n,
    toBlock: head,
  });
  const last = logs.at(-1);
  return last ? toGameEnding(last.args) : null;
}

export function useGameEnd({
  id,
  finished,
  live,
  seenAt,
}: {
  id: bigint;
  finished: boolean;
  live: GameEnding | null;
  seenAt: bigint;
}): GameEnd {
  const read = useQuery({
    queryKey: ["game-end", id.toString(), seenAt.toString()],
    enabled: finished && live === null && seenAt > 0n,
    queryFn: () => readEnd(id, seenAt),
    retry: (failures, error) => error instanceof HistoryBehind && failures < CATCH_UP_ATTEMPTS,
    retryDelay: CATCH_UP_DELAY_MS,
  });
  if (live) return { status: "ready", ...live };
  if (read.isError) return { status: "failed", retry: () => void read.refetch() };
  if (!finished || read.isPending) return { status: "loading" };
  if (read.data === null) return { status: "unknown" };
  return { status: "ready", ...read.data };
}
