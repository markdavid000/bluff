"use client";

import { bluffAbi } from "@bluff/contracts";
import { useDecryptValues } from "@zama-fhe/react-sdk";
import { useState } from "react";
import type { Address, Hex } from "viem";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { useBlockClock } from "@/hooks/use-block-clock";
import { usePermit } from "@/hooks/use-permit";
import type { Face } from "@bluff/game";
import { tableCopy } from "../copy";

const LAST_DIE_VALUE = 5;

function dieValue(value: unknown): number | null {
  const number = typeof value === "bigint" ? Number(value) : value;
  return typeof number === "number" &&
    Number.isInteger(number) &&
    number >= 0 &&
    number <= LAST_DIE_VALUE
    ? number
    : null;
}

export type OwnDice =
  | { status: "none" }
  | { status: "loading" }
  | { status: "locked"; unlock: () => void; unlocking: boolean }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; faces: Face[] };

export function useOwnDice({
  id,
  me,
  round,
  inGame,
}: {
  id: bigint;
  me: Address | undefined;
  round: number;
  inGame: boolean;
}): OwnDice {
  const wanted = inGame && me !== undefined;
  const block = useBlockClock();
  const [roundSeen, setRoundSeen] = useState<{ key: string; block: bigint } | null>(null);
  const roundKey = `${id}:${me ?? ""}:${round}`;
  if (block > 0n && roundSeen?.key !== roundKey) setRoundSeen({ key: roundKey, block });
  const readBlock = roundSeen?.key === roundKey ? roundSeen.block : undefined;
  const permit = usePermit({ working: tableCopy.unlockingDice, automatic: false });
  const read = useReadContract({
    address: contracts.bluff,
    abi: bluffAbi,
    functionName: "diceOf",
    args: me ? [id, me] : undefined,
    blockNumber: readBlock,
    scopeKey: `dice-${id}-round-${round}`,
    query: { enabled: wanted },
  });
  const fresh = wanted && !read.isPlaceholderData ? read.data : undefined;
  const [kept, setKept] = useState<{ round: number; handles: readonly Hex[] } | null>(null);
  if (fresh && (kept?.round !== round || kept.handles.join() !== fresh.join())) {
    setKept({ round, handles: fresh });
  }
  const handles = fresh ?? (wanted && kept?.round === round ? kept.handles : undefined);
  const decrypted = useDecryptValues(
    (handles ?? []).map((handle) => ({ encryptedValue: handle, contractAddress: contracts.bluff })),
    { enabled: handles !== undefined && handles.length > 0 && permit.status === "granted" }
  );

  if (!wanted) return { status: "none" };
  if (handles === undefined) {
    return read.isError
      ? { status: "failed", retry: () => void read.refetch() }
      : { status: "loading" };
  }
  if (handles.length === 0) return { status: "ready", faces: [] };
  if (permit.status === "needed") {
    return { status: "locked", unlock: permit.grant, unlocking: permit.granting };
  }
  if (permit.status !== "granted") return { status: "loading" };
  const values = handles.map((handle) => decrypted.data?.[handle]);
  if (values.some((value) => value === undefined)) {
    return decrypted.isError
      ? { status: "failed", retry: () => void decrypted.refetch() }
      : { status: "loading" };
  }
  const faces: Face[] = [];
  for (const value of values) {
    const die = dieValue(value);
    if (die === null) {
      console.error("A die came back as something other than 0 to 5.", value);
      return { status: "failed", retry: () => void decrypted.refetch() };
    }
    faces.push((die + 1) as Face);
  }
  return { status: "ready", faces };
}
