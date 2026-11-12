"use client";

import { usePrivy, useSendTransaction as usePrivySend, useWallets } from "@privy-io/react-auth";
import {
  type Abi,
  type Address,
  type TransactionReceipt,
  encodeFunctionData,
  isAddressEqual,
} from "viem";
import { usePublicClient, useSendTransaction } from "wagmi";
import { gameChain } from "@/config/chain";
import { MoveNotReadyError } from "@/lib/errors";
import { useEnsureGameChain } from "./use-game-chain";

export interface ContractCall {
  address: Address;
  abi: Abi;
  functionName: string;
  args: readonly unknown[];
}

export type MoveStep = "preparing" | "confirming" | "sending" | "waiting";

export function useSendMove() {
  const { user } = usePrivy();
  const { wallets } = useWallets();
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
    await publicClient.simulateContract({ ...call, account });
    const data = encodeFunctionData(call);
    const embedded = wallets.find(
      (wallet) =>
        wallet.walletClientType === "privy" && isAddressEqual(wallet.address as Address, account)
    );
    let hash: `0x${string}`;
    if (embedded) {
      report("sending");
      ({ hash } = await sendSponsored(
        { to: call.address, data, chainId: gameChain.id },
        { sponsor: true, uiOptions: { showWalletUIs: false } }
      ));
    } else {
      await ensureGameChain();
      report("confirming");
      hash = await sendTransactionAsync({ account, to: call.address, data, chainId: gameChain.id });
      report("sending");
    }
    report("waiting");
    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== "success") throw new Error(`The move ${hash} did not go through.`);
    return receipt;
  };
}
