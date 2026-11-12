"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useNow } from "@/hooks/use-now";
import { useSendMove } from "@/hooks/use-send-move";
import { chipsCopy } from "../copy";

const TICK_MS = 1_000;

export function useClaimChips() {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const queryClient = useQueryClient();
  const sendMove = useSendMove();
  const nextClaim = useReadContract({
    address: contracts.faucet,
    abi: chipFaucetAbi,
    functionName: "nextClaimAt",
    args: account ? [account] : undefined,
    query: { enabled: Boolean(account) },
  });
  const nextClaimMs = nextClaim.data === undefined ? null : Number(nextClaim.data) * 1000;
  const now = useNow(TICK_MS, nextClaimMs !== null);

  const claim = useAction({
    id: "claim-chips",
    working: chipsCopy.claimWorking,
    done: chipsCopy.claimDone,
    run: (report) =>
      sendMove(
        { address: contracts.faucet, abi: chipFaucetAbi, functionName: "claim", args: [""] },
        report
      ),
    onDone: () => {
      invalidateBalanceQueries(queryClient, contracts.chips);
      void nextClaim.refetch();
    },
  });

  if (nextClaimMs === null) return { status: "loading" as const };
  if (nextClaimMs > now) {
    return { status: "waiting" as const, remainingMs: nextClaimMs - now };
  }
  return {
    status: "ready" as const,
    claim: claim.start,
    working: claim.working,
    confirmInWallet: claim.confirmInWallet,
  };
}
