"use client";

import { chipFaucetAbi } from "@bluff/contracts";
import { useState } from "react";
import type { Address } from "viem";
import { useReadContracts } from "wagmi";
import { contracts } from "@/config/chain";
import { avatarSource } from "@/lib/avatar";
import { plainName } from "@/lib/player-tag";

interface PlayerProfile {
  address: Address;
  nickname: string | null;
  name: string;
  avatarSrc: string;
}

export type PlayerProfiles =
  | { status: "loading" }
  | { status: "failed"; retry: () => void }
  | {
      status: "ready";
      pending: boolean;
      profileOf: (address: string) => PlayerProfile | undefined;
    };

function profilesFrom(
  addresses: readonly Address[],
  results: readonly unknown[],
  unnamed: string
): Map<string, PlayerProfile> | null {
  const profiles = new Map<string, PlayerProfile>();
  for (const [index, address] of addresses.entries()) {
    const saved = results[index * 2];
    const avatar = results[index * 2 + 1];
    if (typeof saved !== "string" || !Array.isArray(avatar) || typeof avatar[0] !== "number") {
      console.error("A player's name or face came back in an unexpected shape.", address);
      return null;
    }
    const nickname = saved.trim() === "" ? null : saved;
    profiles.set(address.toLowerCase(), {
      address,
      nickname,
      name: plainName(nickname, unnamed),
      avatarSrc: avatarSource(avatar[0], address),
    });
  }
  return profiles;
}

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

  const [answered, setAnswered] = useState<{
    addresses: readonly Address[];
    data: readonly unknown[];
  } | null>(null);
  const fresh = read.data !== undefined && !read.isPlaceholderData;
  if (fresh && answered?.data !== read.data) setAnswered({ addresses, data: read.data });

  if (addresses.length === 0) {
    return { status: "ready", pending: false, profileOf: () => undefined };
  }
  const retry = () => void read.refetch();
  const source = fresh && read.data ? { addresses, data: read.data } : answered;
  if (!source) return read.isError ? { status: "failed", retry } : { status: "loading" };
  const profiles = profilesFrom(source.addresses, source.data, unnamed);
  if (!profiles) return { status: "failed", retry };
  return {
    status: "ready",
    pending: !fresh,
    profileOf: (address) => profiles.get(address.toLowerCase()),
  };
}
