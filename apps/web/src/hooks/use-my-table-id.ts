"use client";

import { bluffAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { type Query, useQueryClient } from "@tanstack/react-query";
import { type Address, isAddressEqual } from "viem";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";

const REFRESH_MS = 6_000;

export type MyTableId =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; id: bigint | null };

export function useMyTableId(): MyTableId {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const read = useReadContract({
    address: contracts.bluff,
    abi: bluffAbi,
    functionName: "tableOf",
    args: account ? [account] : undefined,
    query: { enabled: Boolean(account), refetchInterval: REFRESH_MS },
  });

  if (read.data !== undefined) return { status: "ready", id: read.data === 0n ? null : read.data };
  if (read.isError) return { status: "failed", retry: () => void read.refetch() };
  return { status: "loading" };
}

function isSeatOf(account: Address, tableId: bigint) {
  return (query: Query) => {
    const request = query.queryKey[1];
    if (typeof request !== "object" || request === null) return false;
    if (!("functionName" in request) || request.functionName !== "tableOf") return false;
    if (!("args" in request) || !Array.isArray(request.args)) return false;
    const [player] = request.args as unknown[];
    return (
      typeof player === "string" &&
      isAddressEqual(player as Address, account) &&
      query.state.data === tableId
    );
  };
}

export function useForgetMyTable() {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const queryClient = useQueryClient();
  return (tableId: bigint) => {
    if (!account) return;
    queryClient.setQueriesData(
      { queryKey: ["readContract"], predicate: isSeatOf(account, tableId) },
      0n
    );
  };
}
