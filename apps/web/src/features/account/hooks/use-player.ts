"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { displayName } from "@/lib/player-tag";
import { accountCopy } from "../copy";

type Address = `0x${string}`;

export type Player =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "ready"; address: Address; name: string; nickname: string | null };

export function usePlayer(): Player {
  const { ready, authenticated, user } = usePrivy();
  const address = user?.wallet?.address as Address | undefined;
  const nickname = useReadContract({
    address: contracts.faucet,
    abi: chipFaucetAbi,
    functionName: "nicknameOf",
    args: address ? [address] : undefined,
    query: { enabled: Boolean(address) },
  });

  if (!ready) return { status: "loading" };
  if (!authenticated) return { status: "signed-out" };
  if (!address || nickname.isPending) return { status: "loading" };
  const saved = nickname.data && nickname.data.length > 0 ? nickname.data : null;
  return {
    status: "ready",
    address,
    nickname: saved,
    name: displayName(saved, address, accountCopy.noNickname),
  };
}
