"use client";

import { bluffAbi } from "@bluff/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useChainId, useConfig } from "wagmi";
import { hashFn, readContractQueryOptions } from "wagmi/query";
import { contracts } from "@/config/chain";
import { tablePath } from "@/lib/table-links";

export function useGoToTable() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const config = useConfig();
  const chainId = useChainId();
  return async (id: bigint) => {
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
