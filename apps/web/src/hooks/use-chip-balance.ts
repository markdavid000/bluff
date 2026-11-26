"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useConfidentialBalance } from "@zama-fhe/react-sdk";
import type { Address } from "viem";
import { contracts } from "@/config/chain";
import { ACCOUNT_READ } from "@/lib/query-client";
import { usePermit } from "./use-permit";

const DECRYPT_ATTEMPTS = 5;
const MAX_RETRY_DELAY_MS = 8_000;

export type ChipBalance =
  | { status: "loading" }
  | { status: "hidden"; reveal: () => void; revealing: boolean; asksWallet: boolean }
  | { status: "ready"; amount: bigint }
  | { status: "failed"; retry: () => void };

export function useChipBalance({
  working,
  automaticPermit = false,
}: {
  working: string;
  automaticPermit?: boolean;
}): ChipBalance {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const permit = usePermit({ working, automatic: automaticPermit });
  const balance = useConfidentialBalance(
    { address: contracts.chips, account },
    {
      ...ACCOUNT_READ,
      enabled: permit.status === "granted",
      retry: DECRYPT_ATTEMPTS,
      retryDelay: (attempt) => Math.min(1000 * 2 ** attempt, MAX_RETRY_DELAY_MS),
    }
  );

  if (!account || permit.status === "checking") return { status: "loading" };
  if (permit.status === "needed") {
    return {
      status: "hidden",
      reveal: permit.grant,
      revealing: permit.granting,
      asksWallet: permit.asksWallet,
    };
  }
  if (balance.isError) return { status: "failed", retry: () => void balance.refetch() };
  if (balance.data === undefined) return { status: "loading" };
  return { status: "ready", amount: balance.data };
}
