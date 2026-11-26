"use client";

import { chipTokenAbi, dollarTokenAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useDecryptPublicValues, useEncrypt } from "@zama-fhe/react-sdk";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { type Address, type Hex, parseEventLogs } from "viem";
import { usePublicClient, useReadContract } from "wagmi";
import { contracts, gameChain, publicRecordOfDollars } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { type MoveStep, useSendMove } from "@/hooks/use-send-move";
import { CashOutWaitingError, MoveNotReadyError } from "@/lib/errors";
import { ACCOUNT_READ } from "@/lib/query-client";
import { chipsCopy } from "../copy";
import { forgetCashOut, rememberCashOut, rememberedCashOuts } from "../lib/pending-cash-outs";
import { firstOpenCashOut, pendingCashOutKey } from "./use-pending-cash-out";

const REVEAL_DEADLINE_MS = 30_000;
const REVEAL_RETRY_MS = 3_000;

export type CashOutAmount = bigint | "everything";

function pause(milliseconds: number) {
  return new Promise((resolve) => window.setTimeout(resolve, milliseconds));
}

export function useCashOut({ onFinished }: { onFinished?: () => void } = {}) {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const publicClient = usePublicClient({ chainId: gameChain.id });
  const queryClient = useQueryClient();
  const sendMove = useSendMove();
  const { mutateAsync: encrypt } = useEncrypt();
  const { mutateAsync: decryptPublic } = useDecryptPublicValues();
  const dollars = useReadContract({
    address: contracts.dollars,
    abi: dollarTokenAbi,
    functionName: "balanceOf",
    args: account ? [account] : undefined,
    query: { ...ACCOUNT_READ, enabled: Boolean(account) },
  });

  function ready() {
    if (!account || !publicClient) throw new MoveNotReadyError();
    return { account, publicClient };
  }

  async function revealAmount(handle: Hex) {
    const deadline = Date.now() + REVEAL_DEADLINE_MS;
    for (;;) {
      try {
        const result = await decryptPublic([handle]);
        const amount = result.clearValues[handle];
        if (typeof amount !== "bigint")
          throw new Error(`The cash out amount ${handle} was not a number.`);
        return { amount, proof: result.decryptionProof };
      } catch (error) {
        if (Date.now() + REVEAL_RETRY_MS > deadline) throw error;
        console.warn("The cash out amount is not public yet. Trying again.", error);
        await pause(REVEAL_RETRY_MS);
      }
    }
  }

  async function burn(amount: CashOutAmount, report: (step: MoveStep) => void): Promise<Hex> {
    const { account, publicClient } = ready();
    report("preparing");
    let args: readonly [Address, Address, Hex] | readonly [Address, Address, Hex, Hex];
    if (amount === "everything") {
      const balance = await publicClient.readContract({
        address: contracts.chips,
        abi: chipTokenAbi,
        functionName: "confidentialBalanceOf",
        args: [account],
      });
      args = [account, account, balance];
    } else {
      const sealed = await encrypt({
        values: [{ type: "euint64", value: amount }],
        contractAddress: contracts.chips,
        userAddress: account,
      });
      const [handle] = sealed.encryptedValues;
      if (!handle) throw new Error("The chips to cash out could not be sealed.");
      args = [account, account, handle, sealed.inputProof];
    }
    const receipt = await sendMove(
      { address: contracts.chips, abi: chipTokenAbi, functionName: "unwrap", args },
      report
    );
    const [requested] = parseEventLogs({
      abi: chipTokenAbi,
      eventName: "UnwrapRequested",
      logs: receipt.logs,
    });
    if (!requested) throw new Error(`The cash out in ${receipt.transactionHash} did not start.`);
    rememberCashOut(account, requested.args.unwrapRequestId);
    return requested.args.unwrapRequestId;
  }

  async function finish(id: Hex, report: (step: MoveStep) => void) {
    const { account, publicClient } = ready();
    report("waiting");
    const handle = await publicClient.readContract({
      address: contracts.chips,
      abi: chipTokenAbi,
      functionName: "unwrapAmount",
      args: [id],
    });
    const { amount, proof } = await revealAmount(handle);
    await sendMove(
      {
        address: contracts.chips,
        abi: chipTokenAbi,
        functionName: "finalizeUnwrap",
        args: [id, amount, proof],
      },
      report
    );
    forgetCashOut(account, id);
  }

  function refresh() {
    invalidateBalanceQueries(queryClient, contracts.chips);
    void queryClient.invalidateQueries({ queryKey: pendingCashOutKey(account) });
    void dollars.refetch();
    onFinished?.();
  }

  const cashOut = useAction({
    id: "cash-out",
    working: chipsCopy.cashOutWorking,
    done: chipsCopy.cashOutDone,
    run: async (report, amount: CashOutAmount) => {
      const { account, publicClient } = ready();
      report("preparing");
      try {
        const unfinished = await firstOpenCashOut(
          publicClient,
          account,
          rememberedCashOuts(account)
        );
        if (unfinished) throw new CashOutWaitingError();
        await finish(await burn(amount, report), report);
      } catch (error) {
        void queryClient.invalidateQueries({ queryKey: pendingCashOutKey(account) });
        throw error;
      }
    },
    onDone: refresh,
  });

  const resume = useAction({
    id: "cash-out",
    working: chipsCopy.cashOutFinishing,
    done: chipsCopy.cashOutDone,
    run: (report, id: Hex) => finish(id, report),
    onDone: refresh,
  });

  return {
    dollars: dollars.data,
    publicRecord: account ? publicRecordOfDollars(account) : null,
    cashOut: cashOut.start,
    resume: resume.start,
    working: cashOut.working || resume.working,
    confirmInWallet: cashOut.confirmInWallet || resume.confirmInWallet,
  };
}
