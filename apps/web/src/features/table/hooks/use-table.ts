"use client";

import { bluffAbi } from "@bluff/contracts";
import { BaseError, ContractFunctionRevertedError } from "viem";
import { useEffect, useState, useSyncExternalStore } from "react";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { useBlockClock } from "@/hooks/use-block-clock";
import { type Table, toTable } from "../lib/table-view";

const READ_ATTEMPTS = 4;

export type TableRead =
  | { status: "loading" }
  | { status: "not-found" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; table: Table; readAt: bigint | null };

function isMissingTable(error: unknown): boolean {
  if (!(error instanceof BaseError)) return false;
  const reverted = error.walk((cause) => cause instanceof ContractFunctionRevertedError);
  return (
    reverted instanceof ContractFunctionRevertedError &&
    reverted.data?.errorName === "TableNotFound"
  );
}

const leftTables = new Set<string>();
const leftListeners = new Set<() => void>();

function onLeftTables(listener: () => void) {
  leftListeners.add(listener);
  return () => leftListeners.delete(listener);
}

function changeLeftTables(change: () => void) {
  change();
  leftListeners.forEach((listener) => listener());
}

export function isNotTableRead(query: { queryKey: readonly unknown[] }): boolean {
  const request = query.queryKey[1];
  return !(
    typeof request === "object" &&
    request !== null &&
    "functionName" in request &&
    request.functionName === "getTable"
  );
}

export function markLeftTable(id: bigint) {
  changeLeftTables(() => leftTables.add(id.toString()));
}

export function useTable(id: bigint): TableRead {
  const left = useSyncExternalStore(
    onLeftTables,
    () => leftTables.has(id.toString()),
    () => false
  );
  useEffect(() => () => changeLeftTables(() => leftTables.delete(id.toString())), [id]);
  const block = useBlockClock();
  const [shownId, setShownId] = useState<bigint | null>(null);
  const pinned = shownId === id && block > 0n;
  const read = useReadContract({
    address: contracts.bluff,
    abi: bluffAbi,
    functionName: "getTable",
    args: [id],
    blockNumber: pinned ? block : undefined,
    query: {
      enabled: !left,
      placeholderData: (previous) => previous,
      retry: (failures, error) => !isMissingTable(error) && failures < READ_ATTEMPTS,
    },
  });
  const data = read.data && read.data[0].id === id ? read.data : undefined;
  const missing = read.isError && isMissingTable(read.error);

  if (data && !read.isPlaceholderData && shownId !== id) setShownId(id);
  if (missing && shownId !== null) setShownId(null);

  if (data) {
    const [view, seats] = data;
    const readAt = pinned && !read.isPlaceholderData ? block : null;
    return { status: "ready", table: toTable(view, seats), readAt };
  }
  if (read.isError) {
    if (!missing) return { status: "failed", retry: () => void read.refetch() };
    return pinned ? { status: "loading" } : { status: "not-found" };
  }
  return { status: "loading" };
}
