"use client";

import { bluffAbi, chipTokenAbi } from "@bluff/contracts";
import { usePrivy } from "@privy-io/react-auth";
import { useQueryClient } from "@tanstack/react-query";
import { useEncrypt } from "@zama-fhe/react-sdk";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import type { Address } from "viem";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { type MoveStep, useSendMove } from "@/hooks/use-send-move";
import { MoveNotReadyError } from "@/lib/errors";
import { lobbyCopy } from "../copy";
import { type LobbyTable, joinRequestData, openSeats } from "../lib/tables";

export const PLAY_NOW_SEATS = 2;

export type Seat =
  | { kind: "create"; seatCount: number; buyIn: bigint; isPrivate: boolean }
  | { kind: "join"; tableId: bigint; buyIn: bigint };

export function pickTableToJoin(tables: LobbyTable[], buyIn: bigint): LobbyTable | null {
  const matching = tables.filter(
    (table) => table.waiting && table.buyIn === buyIn && openSeats(table) > 0
  );
  matching.sort((a, b) => openSeats(a) - openSeats(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return matching[0] ?? null;
}

export function useSitDown({ onSeated }: { onSeated?: () => void } = {}) {
  const { user } = usePrivy();
  const account = user?.wallet?.address as Address | undefined;
  const queryClient = useQueryClient();
  const sendMove = useSendMove();
  const { mutateAsync: encrypt } = useEncrypt();

  async function sit(seat: Seat, report: (step: MoveStep) => void) {
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
    if (!account) throw new MoveNotReadyError();
    report("preparing");
    const sealed = await encrypt({
      values: [{ type: "euint64", value: seat.buyIn }],
      contractAddress: contracts.chips,
      userAddress: account,
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

  function refresh() {
    invalidateBalanceQueries(queryClient, contracts.chips);
    void queryClient.invalidateQueries({ queryKey: ["readContract"] });
    onSeated?.();
  }

  const create = useAction({
    id: "create-table",
    working: lobbyCopy.createWorking,
    run: (report, seat: Extract<Seat, { kind: "create" }>) => sit(seat, report),
    onDone: refresh,
  });

  const createPaid = useAction({
    id: "create-table",
    working: lobbyCopy.createPaidWorking,
    run: (report, seat: Extract<Seat, { kind: "create" }>) => sit(seat, report),
    onDone: refresh,
  });

  const join = useAction({
    id: "join-table",
    working: lobbyCopy.joinWorking,
    run: (report, seat: Extract<Seat, { kind: "join" }>) => sit(seat, report),
    onDone: refresh,
  });

  const playNow = useAction({
    id: "play-now",
    working: lobbyCopy.playNowWorking,
    run: (report, tables: LobbyTable[], buyIn: bigint) => {
      const table = pickTableToJoin(tables, buyIn);
      return sit(
        table
          ? { kind: "join", tableId: table.id, buyIn }
          : { kind: "create", seatCount: PLAY_NOW_SEATS, buyIn, isPrivate: false },
        report
      );
    },
    onDone: refresh,
  });

  return {
    create: (seat: Extract<Seat, { kind: "create" }>) =>
      seat.buyIn === 0n ? create.start(seat) : createPaid.start(seat),
    join: join.start,
    playNow: playNow.start,
    creating: create.working || createPaid.working,
    joining: join.working,
    findingSeat: playNow.working,
    working: create.working || createPaid.working || join.working || playNow.working,
    confirmInWallet:
      create.confirmInWallet ||
      createPaid.confirmInWallet ||
      join.confirmInWallet ||
      playNow.confirmInWallet,
  };
}
