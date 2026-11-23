"use client";

import { bluffAbi } from "@bluff/contracts";
import { toTable } from "@bluff/game";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import { getAbiItem } from "viem";
import { contracts, gameClient } from "@/config/chain";
import { type LiveGame, liveGames } from "../lib/live-games";

const LOOK_BACK_BLOCKS = 150n;
const REFRESH_MS = 10_000;
const GAME_STARTED = getAbiItem({ abi: bluffAbi, name: "GameStarted" });

export type GamesInPlay =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; games: LiveGame[] };

export function useGamesInPlay(): GamesInPlay {
  const { user } = usePrivy();
  const read = useQuery({
    queryKey: ["lobby", "games-in-play"],
    refetchInterval: REFRESH_MS,
    queryFn: async () => {
      const latest = await gameClient.getBlockNumber();
      const fromBlock = latest > LOOK_BACK_BLOCKS ? latest - LOOK_BACK_BLOCKS : 0n;
      const logs = await gameClient.getLogs({
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
      return Promise.all(
        newestFirst.map(async (id) => {
          const [view, seats] = await gameClient.readContract({
            address: contracts.bluff,
            abi: bluffAbi,
            functionName: "getTable",
            args: [id],
          });
          return toTable(view, seats);
        })
      );
    },
  });

  if (read.data) return { status: "ready", games: liveGames(read.data, user?.wallet?.address) };
  if (read.isError) return { status: "failed", retry: () => void read.refetch() };
  return { status: "loading" };
}
