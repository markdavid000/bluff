"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useHasPermit, useZamaSDK } from "@zama-fhe/react-sdk";
import { grantPermitMutationOptions, zamaQueryKeys } from "@zama-fhe/sdk/query";
import { useEffect, useEffectEvent, useRef } from "react";
import { useConnection } from "wagmi";
import { contracts } from "@/config/chain";
import { MoveNotReadyError } from "@/lib/errors";
import { useAction } from "./use-action";
import { useEnsureGameChain } from "./use-game-chain";

const HIDDEN_VALUE_CONTRACTS = [contracts.chips, contracts.bluff, contracts.invites];

type PermitStatus = "checking" | "needed" | "granted" | "failed";

export function usePermit({ working, automatic }: { working: string; automatic: boolean }) {
  const { user } = usePrivy();
  const embedded = user?.wallet?.walletClientType === "privy";
  const { address: signer, status: connection } = useConnection();
  const signerIsPlayer =
    connection === "connected" &&
    Boolean(signer && user?.wallet) &&
    signer?.toLowerCase() === user?.wallet?.address.toLowerCase();
  const sdk = useZamaSDK();
  const queryClient = useQueryClient();
  const ensureGameChain = useEnsureGameChain();
  const hasPermit = useHasPermit({ contractAddresses: HIDDEN_VALUE_CONTRACTS });
  const { mutateAsync: grantPermit } = useMutation({
    ...grantPermitMutationOptions(sdk),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: zamaQueryKeys.hasPermit.all }),
  });
  const autoGranted = useRef(false);

  const grant = useAction({
    id: "permit",
    working,
    quiet: true,
    run: async (report) => {
      if (!signerIsPlayer) throw new MoveNotReadyError();
      if (!embedded) {
        await ensureGameChain();
        report("confirming");
      }
      await grantPermit(HIDDEN_VALUE_CONTRACTS);
    },
  });

  const status: PermitStatus = !signerIsPlayer
    ? "checking"
    : hasPermit.data === true
      ? "granted"
      : hasPermit.data === false
        ? "needed"
        : hasPermit.isError
          ? "failed"
          : "checking";

  const grantSilently = useEffectEvent(() => grant.start());

  useEffect(() => {
    if (!automatic || status !== "needed" || !embedded || autoGranted.current) return;
    autoGranted.current = true;
    grantSilently();
  }, [automatic, status, embedded]);

  return {
    status,
    granting: grant.working,
    grant: grant.start,
    retry: () => void hasPermit.refetch(),
    asksWallet: !embedded,
  };
}
