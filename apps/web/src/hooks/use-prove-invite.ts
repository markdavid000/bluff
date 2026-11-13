"use client";

import { bluffInvitesAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useDecryptPublicValues, useEncrypt } from "@zama-fhe/react-sdk";
import { type Address, isAddressEqual, parseEventLogs, zeroHash } from "viem";
import { usePublicClient } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { InviteNotWorkingError, MoveNotReadyError } from "@/lib/errors";
import { keepTrying } from "@/lib/keep-trying";
import { type MoveStep, useSendMove } from "./use-send-move";

const REVEAL_DEADLINE_MS = 30_000;
const REVEAL_RETRY_MS = 3_000;

export function useProveInvite() {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const publicClient = usePublicClient({ chainId: gameChain.id });
  const sendMove = useSendMove();
  const { mutateAsync: encrypt } = useEncrypt();
  const { mutateAsync: decryptPublic } = useDecryptPublicValues();

  return async function proveInvite(
    id: bigint,
    code: bigint,
    report: (step: MoveStep) => void
  ): Promise<void> {
    if (!account || !publicClient) throw new MoveNotReadyError();
    const read = { address: contracts.invites, abi: bluffInvitesAbi } as const;

    const invited = await publicClient.readContract({
      ...read,
      functionName: "isInvited",
      args: [id, account],
    });
    if (invited) return;

    let attempt = await publicClient.readContract({
      ...read,
      functionName: "attemptOf",
      args: [id, account],
    });
    if (attempt === zeroHash) {
      report("preparing");
      const sealed = await encrypt({
        values: [{ type: "euint64", value: code }],
        contractAddress: contracts.invites,
        userAddress: account,
      });
      const [handle] = sealed.encryptedValues;
      if (!handle) throw new Error("The invite code could not be sealed.");
      const tried = await sendMove(
        { ...read, functionName: "tryCode", args: [id, handle, sealed.inputProof] },
        report
      );
      attempt = await publicClient.readContract({
        ...read,
        functionName: "attemptOf",
        args: [id, account],
        blockNumber: tried.blockNumber,
      });
    }

    const answer = await keepTrying(() => decryptPublic([attempt]), {
      forMs: REVEAL_DEADLINE_MS,
      everyMs: REVEAL_RETRY_MS,
    });
    const confirmed = await sendMove(
      {
        ...read,
        functionName: "confirmCode",
        args: [id, account, answer.abiEncodedClearValues, answer.decryptionProof],
      },
      report
    );
    const welcomed = parseEventLogs({
      abi: bluffInvitesAbi,
      eventName: "Invited",
      logs: confirmed.logs,
    }).some(
      (log) =>
        isAddressEqual(log.address, contracts.invites) &&
        log.args.id === id &&
        isAddressEqual(log.args.player, account)
    );
    if (!welcomed) throw new InviteNotWorkingError();
  };
}
