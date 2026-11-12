"use client";

import { chipTokenAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useQuery } from "@tanstack/react-query";
import {
  type Address,
  type Hex,
  type PublicClient,
  createPublicClient,
  getAbiItem,
  isAddressEqual,
} from "viem";
import { contracts, gameChain, historyTransport } from "@/config/chain";
import { MoveNotReadyError } from "@/lib/errors";
import { forgetCashOut, rememberedCashOuts } from "../lib/pending-cash-outs";

const RECENT_BLOCKS = 9_000n;

const historyClient = createPublicClient({ chain: gameChain, transport: historyTransport });

const unwrapRequested = getAbiItem({ abi: chipTokenAbi, name: "UnwrapRequested" });

export function pendingCashOutKey(account: Address | undefined) {
  return ["pending-cash-out", account] as const;
}

async function recentCashOuts(account: Address): Promise<Hex[]> {
  const head = await historyClient.getBlockNumber();
  const logs = await historyClient.getLogs({
    address: contracts.chips,
    event: unwrapRequested,
    args: { receiver: account },
    fromBlock: head > RECENT_BLOCKS ? head - RECENT_BLOCKS : 0n,
    toBlock: head,
  });
  return logs.flatMap((log) => (log.args.unwrapRequestId ? [log.args.unwrapRequestId] : []));
}

export async function firstOpenCashOut(
  publicClient: PublicClient,
  account: Address,
  ids: readonly Hex[]
): Promise<Hex | null> {
  const remembered = rememberedCashOuts(account);
  for (const id of ids) {
    const requester = await publicClient.readContract({
      address: contracts.chips,
      abi: chipTokenAbi,
      functionName: "unwrapRequester",
      args: [id],
    });
    if (isAddressEqual(requester, account)) return id;
    if (remembered.includes(id)) forgetCashOut(account, id);
  }
  return null;
}

export function usePendingCashOut() {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;

  return useQuery({
    queryKey: pendingCashOutKey(account),
    enabled: Boolean(account),
    queryFn: async () => {
      if (!account) throw new MoveNotReadyError();
      const ids = new Set([...rememberedCashOuts(account), ...(await recentCashOuts(account))]);
      return firstOpenCashOut(historyClient, account, [...ids]);
    },
  });
}
