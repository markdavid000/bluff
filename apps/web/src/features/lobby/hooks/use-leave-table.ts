"use client";

import { bluffAbi } from "@bluff/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useSendMove } from "@/hooks/use-send-move";
import { lobbyCopy } from "../copy";

export function useLeaveTable() {
  const queryClient = useQueryClient();
  const sendMove = useSendMove();
  const leave = useAction({
    id: "leave-table",
    working: lobbyCopy.leaveWorking,
    done: lobbyCopy.leaveDone,
    run: (report, id: bigint) =>
      sendMove(
        { address: contracts.bluff, abi: bluffAbi, functionName: "leaveTable", args: [id] },
        report
      ),
    onDone: () => {
      invalidateBalanceQueries(queryClient, contracts.chips);
      void queryClient.invalidateQueries({ queryKey: ["readContract"] });
    },
  });
  return { leave: leave.start, leaving: leave.working, confirmInWallet: leave.confirmInWallet };
}
