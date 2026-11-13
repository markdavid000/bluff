"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useReadContracts } from "wagmi";
import { contracts } from "@/config/chain";
import { avatarSource } from "@/lib/avatar";
import { displayName } from "@/lib/player-tag";
import { accountCopy } from "../copy";

type Address = `0x${string}`;

export type Player =
  | { status: "loading" }
  | { status: "signed-out" }
  | { status: "failed" }
  | {
      status: "ready";
      address: Address;
      name: string;
      nickname: string | null;
      avatar: number;
      avatarSrc: string;
    };

export function usePlayer(): Player & { refresh: () => Promise<unknown> } {
  const { ready, authenticated, user } = usePrivy();
  const address = user?.wallet?.address as Address | undefined;
  const profile = useReadContracts({
    contracts: address
      ? [
          {
            address: contracts.faucet,
            abi: chipFaucetAbi,
            functionName: "nicknameOf",
            args: [address],
          },
          {
            address: contracts.faucet,
            abi: chipFaucetAbi,
            functionName: "avatarOf",
            args: [address],
          },
        ]
      : [],
    allowFailure: false,
    query: { enabled: Boolean(address) },
  });
  const refresh = () => profile.refetch();

  if (!ready) return { status: "loading", refresh };
  if (!authenticated) return { status: "signed-out", refresh };
  if (address && profile.isError) return { status: "failed", refresh };
  if (!address || profile.isPending || profile.isPlaceholderData || !profile.data)
    return { status: "loading", refresh };
  const [savedName, avatar]: readonly unknown[] = profile.data;
  if (typeof savedName !== "string" || !Array.isArray(avatar) || typeof avatar[0] !== "number") {
    console.error("The player's name or face came back in an unexpected shape.");
    return { status: "failed", refresh };
  }
  const preset = avatar[0];
  const nickname = savedName.length > 0 ? savedName : null;
  return {
    status: "ready",
    address,
    nickname,
    avatar: preset,
    avatarSrc: avatarSource(preset, address),
    name: displayName(nickname, address, accountCopy.noNickname),
    refresh,
  };
}
