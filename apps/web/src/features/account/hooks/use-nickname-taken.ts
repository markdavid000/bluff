"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { useEffect, useState } from "react";
import type { Address } from "viem";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { isValidNickname } from "@/lib/nickname";

export const NICKNAME_CHECK_MS = 400;

export function useNicknameTaken(nickname: string, player: Address | undefined): boolean {
  const [settled, setSettled] = useState(nickname);
  useEffect(() => {
    const timer = window.setTimeout(() => setSettled(nickname), NICKNAME_CHECK_MS);
    return () => window.clearTimeout(timer);
  }, [nickname]);
  const askable = player !== undefined && settled === nickname && isValidNickname(settled);
  const read = useReadContract({
    address: contracts.faucet,
    abi: chipFaucetAbi,
    functionName: "isNicknameTaken",
    args: askable ? [settled, player] : undefined,
    query: { enabled: askable },
  });
  return askable && !read.isPlaceholderData && read.data === true;
}
