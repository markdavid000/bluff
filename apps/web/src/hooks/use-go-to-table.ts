"use client";

import { bluffAbi } from "@bluff/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useSyncExternalStore } from "react";
import { useChainId, useConfig } from "wagmi";
import { hashFn, readContractQueryOptions } from "wagmi/query";
import { contracts } from "@/config/chain";
import { tablePath } from "@/lib/table-links";

let heading: bigint | null = null;
let takingSeat = 0;
const listeners = new Set<() => void>();

function changed() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setHeading(id: bigint | null) {
  if (heading === id) return;
  heading = id;
  changed();
}

export async function takeSeatWhileHere(
  take: () => Promise<bigint>,
  stillHere: () => boolean
): Promise<bigint> {
  takingSeat += 1;
  changed();
  try {
    const id = await take();
    if (stillHere()) setHeading(id);
    return id;
  } finally {
    takingSeat -= 1;
    changed();
  }
}

export function useTakingSeat(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => takingSeat > 0,
    () => false
  );
}

export function headToTable(id: bigint) {
  setHeading(id);
}

export function stopHeadingTo(id: bigint) {
  if (heading === id) setHeading(null);
}

export function arriveAtTable() {
  setHeading(null);
}

export function useHeadingTo(): bigint | null {
  return useSyncExternalStore(
    subscribe,
    () => heading,
    () => null
  );
}

export function useGoToTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const config = useConfig();
  const chainId = useChainId();
  return async (id: bigint) => {
    headToTable(id);
    await queryClient.prefetchQuery({
      ...readContractQueryOptions(config, {
        address: contracts.bluff,
        abi: bluffAbi,
        functionName: "getTable",
        args: [id],
        chainId,
      }),
      queryKeyHashFn: hashFn,
    });
    router.push(tablePath(id));
  };
}
