"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";
import { contracts } from "@/config/chain";
import { avatarSource } from "@/lib/avatar";
import { displayName } from "@/lib/player-tag";

interface PlayerProfile {
  address: Address;
  nickname: string | null;
  name: string;
  avatarSrc: string;
}

export type PlayerProfiles =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; profileOf: (address: string) => PlayerProfile | undefined };

export function usePlayerProfiles(addresses: Address[], unnamed: string): PlayerProfiles {
  const read = useReadContracts({
    contracts: addresses.flatMap((address) => [
      {
        address: contracts.faucet,
        abi: chipFaucetAbi,
        functionName: "nicknameOf",
        args: [address],
      },
      { address: contracts.faucet, abi: chipFaucetAbi, functionName: "avatarOf", args: [address] },
    ]),
    allowFailure: false,
    query: { enabled: addresses.length > 0 },
  });

  if (addresses.length === 0) return { status: "ready", profileOf: () => undefined };
  if (!read.data || read.isPlaceholderData) {
    return read.isError
      ? { status: "failed", retry: () => void read.refetch() }
      : { status: "loading" };
  }

  const results: readonly unknown[] = read.data;
  const retry = () => void read.refetch();
  const profiles = new Map<string, PlayerProfile>();
  for (const [index, address] of addresses.entries()) {
    const saved = results[index * 2];
    const avatar = results[index * 2 + 1];
    if (typeof saved !== "string" || !Array.isArray(avatar) || typeof avatar[0] !== "number") {
      console.error("A player's name or face came back in an unexpected shape.", address);
      return { status: "failed", retry };
    }
    const nickname = saved.trim() === "" ? null : saved;
    profiles.set(address.toLowerCase(), {
      address,
      nickname,
      name: displayName(nickname, address, unnamed),
      avatarSrc: avatarSource(avatar[0], address),
    });
  }
  return { status: "ready", profileOf: (address) => profiles.get(address.toLowerCase()) };
}
