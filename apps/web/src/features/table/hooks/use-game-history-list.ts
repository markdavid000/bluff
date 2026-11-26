"use client";

import { bluffAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { skipToken, useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { hashFn } from "wagmi/query";
import { type Address, getAbiItem } from "viem";
import { bluffDeployBlock, contracts, gameClient, logsClient } from "@/config/chain";
import { ACCOUNT_READ } from "@/lib/query-client";
import { usePlayerProfiles } from "@/hooks/use-player-profiles";
import { tableCopy } from "../copy";
import { type GameEnding, toGameEnding } from "../lib/game-end";
import {
  type FoundGame,
  type HistoryGame,
  blockSpans,
  historyGames,
  mergeGames,
} from "../lib/game-log";
import { type GameLogMemory, rememberGames, rememberedGames } from "../lib/remembered-games";
import { toTable } from "@bluff/game";

const PAGE = 20;
const SPAN = 50_000n;
const playerJoined = getAbiItem({ abi: bluffAbi, name: "PlayerJoined" });
const playerLeft = getAbiItem({ abi: bluffAbi, name: "PlayerLeft" });
const gameEnded = getAbiItem({ abi: bluffAbi, name: "GameEnded" });

function found(logs: readonly { args: { id?: bigint }; blockNumber: bigint }[]): FoundGame[] {
  return logs.flatMap((log) =>
    log.args.id === undefined ? [] : [{ id: log.args.id, block: log.blockNumber }]
  );
}

async function searchLog(me: Address): Promise<GameLogMemory> {
  const memory = rememberedGames(me);
  const head = await logsClient.getBlockNumber();
  const joins: FoundGame[] = [];
  const lefts: FoundGame[] = [];
  const from = memory ? memory.searchedTo + 1n : bluffDeployBlock;
  for (const [fromBlock, toBlock] of blockSpans(from, head, SPAN)) {
    const [joined, left] = await Promise.all([
      logsClient.getLogs({
        address: contracts.bluff,
        event: playerJoined,
        args: { player: me },
        fromBlock,
        toBlock,
      }),
      logsClient.getLogs({
        address: contracts.bluff,
        event: playerLeft,
        args: { player: me },
        fromBlock,
        toBlock,
      }),
    ]);
    joins.push(...found(joined));
    lefts.push(...found(left));
  }
  const next = {
    searchedTo: head,
    joins: mergeGames(memory?.joins ?? [], joins),
    lefts: mergeGames(memory?.lefts ?? [], lefts),
  };
  rememberGames(me, next);
  return next;
}

async function readEndings(ids: readonly bigint[]): Promise<Map<bigint, GameEnding>> {
  const endings = new Map<bigint, GameEnding>();
  if (ids.length === 0) return endings;
  const head = await logsClient.getBlockNumber();
  for (const [fromBlock, toBlock] of blockSpans(bluffDeployBlock, head, SPAN)) {
    const logs = await logsClient.getLogs({
      address: contracts.bluff,
      event: gameEnded,
      args: { id: [...ids] },
      fromBlock,
      toBlock,
    });
    for (const log of logs) {
      const ending = toGameEnding(log.args);
      if (log.args.id !== undefined && ending) endings.set(log.args.id, ending);
    }
  }
  return endings;
}

async function readGames(me: Address, memory: GameLogMemory, shown: number) {
  const page = memory.joins.slice(0, shown);
  const reads = await gameClient.multicall({
    contracts: page.map((game) => ({
      address: contracts.bluff,
      abi: bluffAbi,
      functionName: "getTable" as const,
      args: [game.id] as const,
    })),
    allowFailure: false,
  });
  const tables = reads.map(([view, seats]) => toTable(view, seats));
  const endings = await readEndings(
    tables.filter((table) => table.status === "finished").map((table) => table.id)
  );
  return historyGames({ tables, joins: memory.joins, lefts: memory.lefts, endings, me });
}

export type GameHistoryList =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | {
      status: "ready";
      games: HistoryGame[];
      more: boolean;
      loadingMore: boolean;
      loadMore: () => void;
      nameOf: (address: string) => string;
      faceOf: (address: string) => string | undefined;
    };

export function useGameHistoryList(): GameHistoryList {
  const { user } = usePrivy();
  const me = user?.wallet?.address as Address | undefined;
  const [shown, setShown] = useState(PAGE);
  const log = useQuery({
    ...ACCOUNT_READ,
    queryKey: ["game-log", me],
    queryFn: me ? () => searchLog(me) : skipToken,
  });
  const memory = log.data;
  const games = useQuery({
    queryKey: ["game-history", me, memory, shown],
    queryKeyHashFn: hashFn,
    queryFn: me && memory ? () => readGames(me, memory, shown) : skipToken,
    placeholderData: (previous, previousQuery) =>
      previousQuery?.queryKey[1] === me ? previous : undefined,
  });
  const players = [
    ...new Set((games.data ?? []).flatMap((game) => game.table.seats.map((seat) => seat.player))),
  ];
  const profiles = usePlayerProfiles(players, tableCopy.unnamed);

  const retry = () => {
    if (log.isError) void log.refetch();
    else void games.refetch();
  };
  if (log.isError || games.isError) return { status: "failed", retry };
  if (!memory || !games.data) return { status: "loading" };
  const ready = profiles.status === "ready" ? profiles : null;
  return {
    status: "ready",
    games: games.data,
    more: memory.joins.length > shown,
    loadingMore: games.isPlaceholderData,
    loadMore: () => setShown((count) => count + PAGE),
    nameOf: (address) =>
      ready?.profileOf(address)?.name ?? (ready?.pending === false ? tableCopy.unnamed : ""),
    faceOf: (address) => ready?.profileOf(address)?.avatarSrc,
  };
}
