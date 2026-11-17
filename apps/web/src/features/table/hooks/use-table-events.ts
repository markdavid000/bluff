"use client";

import { bluffAbi } from "@bluff/contracts";
import { useWatchContractEvent } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { seeBlock } from "@/lib/block-clock";
import { notify } from "@/lib/notify";
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
  onBidPlaced,
  onRoundSettled,
  onGameEnded,
}: {
  id: bigint;
  me: string | undefined;
  host?: string;
  nameOf: (address: string) => string;
  onBidPlaced?: (bid: PlacedBid) => void;
  onRoundSettled?: (result: RoundResult) => void;
  onGameEnded?: (ending: GameEnding) => void;
}) {
  function handle(logs: readonly WatchedLog[]) {
    let tableHost = host;
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
      const words = noticeFor(toEvent(log), me, nameOf, tableHost);
      if (words) notify.info(words, { id: `table-${log.transactionHash}-${log.logIndex}` });
    }
  }

  useWatchContractEvent({
    address: contracts.bluff,
    abi: bluffAbi,
    chainId: gameChain.id,
    onLogs: handle,
  });
}
