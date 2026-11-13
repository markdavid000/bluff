"use client";

import { bluffAbi } from "@bluff/contracts";
import { useWatchContractEvent } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { seeBlock } from "@/lib/block-clock";
import { notify } from "@/lib/notify";
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

function toEvent(log: WatchedLog): TableEvent {
  const player = field(log.args, "player");
  const host = field(log.args, "host");
  const ready = field(log.args, "ready");
  return {
    eventName: log.eventName,
    args: {
      player: typeof player === "string" ? player : undefined,
      host: typeof host === "string" ? host : undefined,
      ready: typeof ready === "boolean" ? ready : undefined,
    },
  };
}

export function useTableEvents({
  id,
  me,
  nameOf,
}: {
  id: bigint;
  me: string | undefined;
  nameOf: (address: string) => string;
}) {
  function handle(logs: readonly WatchedLog[]) {
    for (const log of logs) {
      if (field(log.args, "id") !== id) continue;
      if (log.blockNumber !== null) seeBlock(log.blockNumber);
      const words = noticeFor(toEvent(log), me, nameOf);
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
