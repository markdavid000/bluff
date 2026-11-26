"use client";

import {
  bluffAbi,
  bluffCashierAbi,
  bluffInvitesAbi,
  chipFaucetAbi,
  chipTokenAbi,
} from "@bluff/contracts";
import { usePrivy, useSendTransaction as usePrivySend } from "@privy-io/react-auth";
import { type Abi, type Address, type TransactionReceipt, encodeFunctionData } from "viem";
import { usePublicClient, useSendTransaction } from "wagmi";
import { gameChain } from "@/config/chain";
import { seeBlock } from "@/lib/block-clock";
import { MoveNotReadyError, refusedWithoutReason } from "@/lib/errors";
import { useEnsureGameChain } from "./use-game-chain";
import { useMovesSponsored } from "./use-moves-sponsored";

export interface ContractCall {
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}

const GAME_ERRORS: Abi = [
  ...new Map(
    [...bluffAbi, ...bluffCashierAbi, ...bluffInvitesAbi, ...chipFaucetAbi, ...chipTokenAbi]
      .filter((item) => item.type === "error")
      .map((item) => [item.name, item])
  ).values(),
];

export type MoveStep = "preparing" | "confirming" | "sending" | "waiting";

const RECEIPT_CHECK_MS = 1_000;
export const SPONSOR_TRIES = 3;
export const SPONSOR_RETRY_MS = 4_000;
function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useSendMove() {
  const { user } = usePrivy();
  const sponsored = useMovesSponsored();
  const { sendTransaction: sendSponsored } = usePrivySend();
  const { sendTransactionAsync } = useSendTransaction();
  const publicClient = usePublicClient({ chainId: gameChain.id });
  const ensureGameChain = useEnsureGameChain();

  return async function sendMove(
    call: ContractCall,
    report: (step: MoveStep) => void
  ): Promise<TransactionReceipt> {
    const account = user?.wallet?.address as Address | undefined;
    if (!account || !publicClient) throw new MoveNotReadyError();
    report("preparing");
    const check = () =>
      publicClient.simulateContract({ ...call, abi: [...call.abi, ...GAME_ERRORS], account });
    await check();
    const data = encodeFunctionData(call);
    let hash: `0x${string}`;
    if (sponsored) {
      report("sending");
      for (let attempt = 1; ; attempt++) {
        try {
          ({ hash } = await sendSponsored(
            { to: call.address, data, chainId: gameChain.id },
            { sponsor: true, uiOptions: { showWalletUIs: false } }
          ));
          break;
        } catch (error) {
          if (!refusedWithoutReason(error) || attempt >= SPONSOR_TRIES) throw error;
          await pause(SPONSOR_RETRY_MS);
          await check();
        }
      }
    } else {
      await ensureGameChain();
      report("confirming");
      hash = await sendTransactionAsync({ account, to: call.address, data, chainId: gameChain.id });
      report("sending");
    }
    report("waiting");
    const receipt = await publicClient.waitForTransactionReceipt({
      hash,
      pollingInterval: RECEIPT_CHECK_MS,
    });
    if (receipt.status !== "success") throw new Error(`The move ${hash} did not go through.`);
    seeBlock(receipt.blockNumber);
    return receipt;
  };
}
