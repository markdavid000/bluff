"use client";

import { bluffAbi } from "@bluff/contracts";
import { toTable } from "@bluff/game";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { getAbiItem } from "viem";
import { contracts, gameClient, historyClient } from "@/config/chain";
import { type LiveGame, liveGames } from "../lib/live-games";

const LOOK_BACK_BLOCKS = 600n;
const WATCHING_REFRESH_MS = 10_000;
const COUNT_REFRESH_MS = 60_000;
const GAME_STARTED = getAbiItem({ abi: bluffAbi, name: "GameStarted" });

export type GamesInPlay =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; games: LiveGame[] };

async function readGamesInPlay() {
  const latest = await historyClient.getBlockNumber();
  const fromBlock = latest > LOOK_BACK_BLOCKS ? latest - LOOK_BACK_BLOCKS : 0n;
  const logs = await historyClient.getLogs({
    address: contracts.bluff,
    event: GAME_STARTED,
    fromBlock,
    toBlock: latest,
  });
  const newestFirst = [
    ...new Set(
      logs
        .map((log) => log.args.id)
        .filter((id): id is bigint => typeof id === "bigint")
        .reverse()
    ),
  ];
  if (newestFirst.length === 0) return [];
  const tables = await gameClient.multicall({
    allowFailure: false,
    contracts: newestFirst.map((id) => ({
      address: contracts.bluff,
      abi: bluffAbi,
      functionName: "getTable" as const,
      args: [id] as const,
    })),
  });
  return tables.map(([view, seats]) => toTable(view, seats));
}

export function useGamesInPlay(watching: boolean): { games: GamesInPlay; refresh: () => void } {
  const { user } = usePrivy();
  const read = useQuery({
    queryKey: ["lobby", "games-in-play"],
    refetchInterval: watching ? WATCHING_REFRESH_MS : COUNT_REFRESH_MS,
    queryFn: readGamesInPlay,
  });
  const refresh = () => void read.refetch();

  if (read.data) {
    return {
      games: { status: "ready", games: liveGames(read.data, user?.wallet?.address) },
      refresh,
    };
  }
  if (read.isError) return { games: { status: "failed", retry: refresh }, refresh };
  return { games: { status: "loading" }, refresh };
}
