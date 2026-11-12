"use client";

import { useConnection, useSwitchChain } from "wagmi";
import { gameChain } from "@/config/chain";

export function useEnsureGameChain() {
  const { chainId } = useConnection();
  const { mutateAsync: switchChain } = useSwitchChain();

  return async function ensureGameChain() {
    if (chainId === gameChain.id) return;
    await switchChain({ chainId: gameChain.id });
  };
}
