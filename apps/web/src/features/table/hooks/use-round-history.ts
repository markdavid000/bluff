"use client";

import { bluffAbi } from "@bluff/contracts";
import { useQuery } from "@tanstack/react-query";
import { getAbiItem } from "viem";
import { contracts, gameClient } from "@/config/chain";
import { type HistoryRound, roundHistory, withCurrentBid } from "../lib/round-history";
import type { Bid } from "@/lib/bid-rules";
import type { Table } from "../lib/table-view";

const LOOK_BACK_BLOCKS = 400n;
const CHECK_EVERY_MS = 10_000;
const EVENTS = [
  getAbiItem({ abi: bluffAbi, name: "RoundStarted" }),
  getAbiItem({ abi: bluffAbi, name: "BidPlaced" }),
  getAbiItem({ abi: bluffAbi, name: "RoundSettled" }),
  getAbiItem({ abi: bluffAbi, name: "TurnTimedOut" }),
] as const;

export type RoundHistoryState =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; rounds: HistoryRound[] };

function forTable(args: unknown, id: bigint): boolean {
  return typeof args === "object" && args !== null && "id" in args && args.id === id;
}

export function useRoundHistory({
  id,
  round,
  bidKey,
  enabled,
}: {
  id: bigint;
  round: number;
  bidKey: string;
  enabled: boolean;
}): RoundHistoryState {
  const read = useQuery({
    queryKey: ["table", "history", id.toString(), round, bidKey],
    enabled,
    refetchInterval: CHECK_EVERY_MS,
    queryFn: async () => {
      const latest = await gameClient.getBlockNumber();
      const fromBlock = latest > LOOK_BACK_BLOCKS ? latest - LOOK_BACK_BLOCKS : 0n;
      const logs = await gameClient.getLogs({
        address: contracts.bluff,
        events: EVENTS,
        fromBlock,
        toBlock: latest,
      });
      return roundHistory(
        logs
          .filter((log) => forTable(log.args, id))
          .map((log) => ({ eventName: log.eventName, args: log.args }))
      );
    },
  });
  if (read.data) return { status: "ready", rounds: read.data };
  if (read.isError) return { status: "failed", retry: () => void read.refetch() };
  return { status: "loading" };
}

export function useGameHistory(
  table: Table,
  enabled: boolean,
  shown: { bid: Bid | null; bidder: string | null }
): RoundHistoryState {
  const bid = table.bid;
  const history = useRoundHistory({
    id: table.id,
    round: table.round,
    bidKey: `${table.status}-${table.turn}-${bid?.quantity ?? 0}-${bid?.face ?? 0}`,
    enabled,
  });
  if (history.status !== "ready") return history;
  return {
    status: "ready",
    rounds: withCurrentBid(
      history.rounds,
      table.round,
      shown.bid && shown.bidder
        ? { player: shown.bidder, quantity: shown.bid.quantity, face: shown.bid.face }
        : null
    ),
  };
}
