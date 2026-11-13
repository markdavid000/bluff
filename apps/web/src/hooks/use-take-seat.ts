"use client";

import { bluffAbi, chipTokenAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { type Address, isAddressEqual, parseEventLogs } from "viem";
import { contracts } from "@/config/chain";
import { MoveNotReadyError } from "@/lib/errors";
import { joinRequestData } from "@/lib/join-request";
import { type MoveStep, useSendMove } from "./use-send-move";

export type SeatRequest =
  | { kind: "create"; seatCount: number; buyIn: bigint; isPrivate: boolean }
  | { kind: "join"; tableId: bigint; buyIn: bigint };

export function useTakeSeat() {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const sendMove = useSendMove();
  const { mutateAsync: encrypt } = useEncrypt();

  async function send(seat: SeatRequest, player: Address, report: (step: MoveStep) => void) {
    if (seat.buyIn === 0n) {
      return seat.kind === "create"
        ? sendMove(
            {
              address: contracts.bluff,
              abi: bluffAbi,
              functionName: "createFreeTable",
              args: [seat.seatCount, seat.isPrivate],
            },
            report
          )
        : sendMove(
            {
              address: contracts.bluff,
              abi: bluffAbi,
              functionName: "joinFreeTable",
              args: [seat.tableId],
            },
            report
          );
    }
    report("preparing");
    const sealed = await encrypt({
      values: [{ type: "euint64", value: seat.buyIn }],
      contractAddress: contracts.chips,
      userAddress: player,
    });
    const [handle] = sealed.encryptedValues;
    if (!handle) throw new Error("The chips to play could not be sealed.");
    const request =
      seat.kind === "create"
        ? {
            kind: "create" as const,
            seatCount: seat.seatCount,
            buyIn: seat.buyIn,
            isPrivate: seat.isPrivate,
          }
        : { kind: "join" as const, tableId: seat.tableId };
    return sendMove(
      {
        address: contracts.chips,
        abi: chipTokenAbi,
        functionName: "confidentialTransferAndCall",
        args: [contracts.cashier, handle, sealed.inputProof, joinRequestData(request)],
      },
      report
    );
  }

  return async function takeSeat(
    seat: SeatRequest,
    report: (step: MoveStep) => void
  ): Promise<bigint> {
    if (!account) throw new MoveNotReadyError();
    const receipt = await send(seat, account, report);
    const [joined] = parseEventLogs({
      abi: bluffAbi,
      eventName: "PlayerJoined",
      logs: receipt.logs,
    }).filter(
      (log) =>
        isAddressEqual(log.address, contracts.bluff) && isAddressEqual(log.args.player, account)
    );
    if (!joined) throw new Error(`The seat in ${receipt.transactionHash} was not recorded.`);
    return joined.args.id;
  };
}
