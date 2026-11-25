"use client";

import { bluffAbi, chipTokenAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { type Address, isAddressEqual, parseEventLogs } from "viem";
import { usePublicClient } from "wagmi";
import { contracts, gameChain } from "@/config/chain";
import { MoveNotReadyError, mayStillLand } from "@/lib/errors";
import { joinRequestData } from "@/lib/join-request";
import { takeSeatWhileHere } from "./use-go-to-table";
import { type MoveStep, useSendMove } from "./use-send-move";

export const SEAT_RECHECK_MS = 3_000;
export const SEAT_RECHECK_LIMIT_MS = 60_000;

function pause(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export type SeatRequest =
  | { kind: "create"; seatCount: number; buyIn: bigint; isPrivate: boolean }
  | { kind: "join"; tableId: bigint; buyIn: bigint };

export function useTakeSeat() {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const sendMove = useSendMove();
  const { mutateAsync: encrypt } = useEncrypt();
  const publicClient = usePublicClient({ chainId: gameChain.id });

  async function seatThatLanded(seat: SeatRequest, player: Address): Promise<bigint | null> {
    if (!publicClient) return null;
    for (let waited = 0; waited <= SEAT_RECHECK_LIMIT_MS; waited += SEAT_RECHECK_MS) {
      await pause(SEAT_RECHECK_MS);
      const id = await publicClient.readContract({
        address: contracts.bluff,
        abi: bluffAbi,
        functionName: "tableOf",
        args: [player],
      });
      if (id !== 0n) return seat.kind === "join" && id !== seat.tableId ? null : id;
    }
    return null;
  }

  async function seatOf(seat: SeatRequest, player: Address, report: (step: MoveStep) => void) {
    let receipt: Awaited<ReturnType<typeof send>>;
    try {
      receipt = await send(seat, player, report);
    } catch (error) {
      if (!mayStillLand(error)) throw error;
      const landed = await seatThatLanded(seat, player);
      if (landed === null) throw error;
      return landed;
    }
    const [joined] = parseEventLogs({
      abi: bluffAbi,
      eventName: "PlayerJoined",
      logs: receipt.logs,
    }).filter(
      (log) =>
        isAddressEqual(log.address, contracts.bluff) && isAddressEqual(log.args.player, player)
    );
    if (!joined) throw new Error(`The seat in ${receipt.transactionHash} was not recorded.`);
    return joined.args.id;
  }

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
    return takeSeatWhileHere(() => seatOf(seat, account, report));
  };
}
