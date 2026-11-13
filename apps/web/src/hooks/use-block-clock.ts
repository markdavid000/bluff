"use client";

import { useSyncExternalStore } from "react";
import { useWatchBlockNumber } from "wagmi";
import { gameChain } from "@/config/chain";
import { newestBlock, onBlock, seeBlock } from "@/lib/block-clock";

const NO_BLOCK_ON_SERVER = () => 0n;

export function useBlockClock(): bigint {
  return useSyncExternalStore(onBlock, newestBlock, NO_BLOCK_ON_SERVER);
}

export function useFollowChain() {
  useWatchBlockNumber({ chainId: gameChain.id, emitOnBegin: true, onBlockNumber: seeBlock });
}
