"use client";

import { bluffInvitesAbi } from "@bluff/contracts";
import { useDecryptValues } from "@zama-fhe/react-sdk";
import { zeroHash } from "viem";
import { useReadContract } from "wagmi";
import { contracts } from "@/config/chain";
import { usePermit } from "@/hooks/use-permit";
import { tableCopy } from "../copy";

export type InviteCode =
  | { status: "loading" }
  | { status: "locked"; unlock: () => void; unlocking: boolean }
  | { status: "failed"; retry: () => void }
  | { status: "ready"; code: bigint | null };

export function useInviteCode({
  id,
  isPrivate,
  canRead,
}: {
  id: bigint;
  isPrivate: boolean;
  canRead: boolean;
}): InviteCode {
  const wanted = isPrivate && canRead;
  const permit = usePermit({ working: tableCopy.unlockingInvite, automatic: false });
  const read = useReadContract({
    address: contracts.invites,
    abi: bluffInvitesAbi,
    functionName: "codeOf",
    args: [id],
    query: { enabled: wanted },
  });
  const handle = wanted && !read.isPlaceholderData ? read.data : undefined;
  const hasCode = handle !== undefined && handle !== zeroHash;
  const decrypted = useDecryptValues(
    hasCode ? [{ encryptedValue: handle, contractAddress: contracts.invites }] : [],
    { enabled: hasCode && permit.status === "granted" }
  );

  if (!isPrivate) return { status: "ready", code: null };
  if (read.isError) return { status: "failed", retry: () => void read.refetch() };
  if (handle === undefined) return { status: "loading" };
  if (!hasCode) return { status: "ready", code: null };
  if (permit.status === "needed") {
    return { status: "locked", unlock: permit.grant, unlocking: permit.granting };
  }
  if (permit.status === "failed") return { status: "failed", retry: permit.retry };
  if (permit.status !== "granted") return { status: "loading" };
  if (decrypted.isError) return { status: "failed", retry: () => void decrypted.refetch() };
  const code = decrypted.data?.[handle];
  return typeof code === "bigint" ? { status: "ready", code } : { status: "loading" };
}
