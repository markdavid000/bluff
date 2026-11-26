"use client";

import { bluffAbi, chipFaucetAbi } from "@bluff/contracts";
import { getAddress } from "viem";
import { usePublicClient, useWatchContractEvent } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { usePageVisible } from "@/hooks/use-page-visible";
import { seeBlock } from "@/lib/block-clock";
import { notify } from "@/lib/notify";
import { plainName } from "@/lib/player-tag";
import { tableCopy } from "../copy";
import { type GameEnding, toGameEnding } from "../lib/game-end";
import { type TableEvent, noticeFor } from "../lib/notices";

interface WatchedLog {
  eventName: string;
  args: unknown;
  blockNumber: bigint | null;
  logIndex: number | null;
  transactionHash: string | null;
}

function field(args: unknown, name: string): unknown {
  return typeof args === "object" && args !== null && name in args
    ? (args as Record<string, unknown>)[name]
    : undefined;
}

export interface PlacedBid {
  round: number;
  player: string;
  quantity: number;
  face: number;
}

function toPlacedBid(args: unknown): PlacedBid | null {
  const round = count(args, "round");
  const player = text(args, "player");
  const quantity = count(args, "quantity");
  const face = count(args, "face");
  if (round === undefined || player === undefined || quantity === undefined || face === undefined) {
    return null;
  }
  return { round, player, quantity, face };
}

export interface RoundResult {
  round: number;
  face: number;
  quantity: number;
  count: number;
  loser: string;
  faces: number[];
}

function text(args: unknown, name: string): string | undefined {
  const value = field(args, name);
  return typeof value === "string" ? value : undefined;
}

function count(args: unknown, name: string): number | undefined {
  const value = field(args, name);
  return typeof value === "number" ? value : undefined;
}

function toEvent(log: WatchedLog): TableEvent {
  const ready = field(log.args, "ready");
  return {
    eventName: log.eventName,
    args: {
      player: text(log.args, "player"),
      host: text(log.args, "host"),
      ready: typeof ready === "boolean" ? ready : undefined,
    },
  };
}

export function toRoundResult(args: unknown): RoundResult | null {
  const round = count(args, "round");
  const face = count(args, "face");
  const quantity = count(args, "quantity");
  const matched = count(args, "count");
  const loser = text(args, "loser");
  const faces = field(args, "revealedFaces");
  if (
    round === undefined ||
    face === undefined ||
    quantity === undefined ||
    matched === undefined ||
    loser === undefined ||
    !Array.isArray(faces) ||
    !faces.every((value) => typeof value === "number")
  ) {
    return null;
  }
  return { round, face, quantity, count: matched, loser, faces: [...faces] };
}

export function useTableEvents({
  id,
  me,
  host,
  nameOf,
  departing = false,
  waiting = false,
  onBidPlaced,
  onRoundSettled,
  onGameEnded,
}: {
  id: bigint;
  me: string | undefined;
  host?: string;
  nameOf: (address: string) => string | null;
  departing?: boolean;
  waiting?: boolean;
  onBidPlaced?: (bid: PlacedBid) => void;
  onRoundSettled?: (result: RoundResult) => void;
  onGameEnded?: (ending: GameEnding) => void;
}) {
  const client = usePublicClient({ chainId: gameChain.id });
  const visible = usePageVisible();

  async function lookUp(address: string): Promise<string> {
    try {
      if (!client) throw new Error("No connection to read a player's name.");
      const nickname = await client.readContract({
        address: contracts.faucet,
        abi: chipFaucetAbi,
        functionName: "nicknameOf",
        args: [getAddress(address)],
      });
      return plainName(nickname, tableCopy.unnamed);
    } catch (error) {
      console.error("A player's name could not be read for a notice.", error);
      return tableCopy.unnamed;
    }
  }

  function show(pending: { event: TableEvent; key: string; tableHost?: string }[]) {
    const unknown = new Set<string>();
    for (const { event } of pending) {
      const named = event.args.player ?? event.args.host;
      if (named && named.toLowerCase() !== me?.toLowerCase() && nameOf(named) === null) {
        unknown.add(named.toLowerCase());
      }
    }
    const announce = (looked: Map<string, string>) => {
      const name = (address: string) =>
        nameOf(address) ?? looked.get(address.toLowerCase()) ?? tableCopy.unnamed;
      for (const { event, key, tableHost } of pending) {
        if (departing && event.eventName === "TableCancelled") continue;
        const words = noticeFor(event, me, name, tableHost, waiting);
        if (words) notify.info(words, { id: key });
      }
    };
    if (unknown.size === 0) {
      announce(new Map());
      return;
    }
    void Promise.all(
      [...unknown].map(async (address) => [address, await lookUp(address)] as const)
    ).then((found) => announce(new Map(found)));
  }

  function handle(logs: readonly WatchedLog[]) {
    let tableHost = host;
    const pending: { event: TableEvent; key: string; tableHost?: string }[] = [];
    for (const log of logs) {
      if (field(log.args, "id") !== id) continue;
      const newHost = field(log.args, "host");
      if (log.eventName === "HostChanged" && typeof newHost === "string") tableHost = newHost;
      if (log.blockNumber !== null) seeBlock(log.blockNumber);
      if (log.eventName === "BidPlaced") {
        const bid = toPlacedBid(log.args);
        if (bid) onBidPlaced?.(bid);
      }
      if (log.eventName === "RoundSettled") {
        const result = toRoundResult(log.args);
        if (result) onRoundSettled?.(result);
      }
      if (log.eventName === "GameEnded") {
        const ending = toGameEnding(log.args);
        if (ending) onGameEnded?.(ending);
      }
      pending.push({
        event: toEvent(log),
        key: `table-${log.transactionHash}-${log.logIndex}`,
        tableHost,
      });
    }
    show(pending);
  }

  useWatchContractEvent({
    address: contracts.bluff,
    abi: bluffAbi,
    chainId: gameChain.id,
    enabled: visible,
    onLogs: handle,
  });
}
