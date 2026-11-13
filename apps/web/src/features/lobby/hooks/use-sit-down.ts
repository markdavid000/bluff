"use client";

import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { useRouter } from "next/navigation";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { type SeatRequest, useTakeSeat } from "@/hooks/use-take-seat";
import { tablePath } from "@/lib/table-links";
import { lobbyCopy } from "../copy";
import { type LobbyTable, openSeats } from "../lib/tables";

export const PLAY_NOW_SEATS = 2;

type CreateRequest = Extract<SeatRequest, { kind: "create" }>;
type JoinRequest = Extract<SeatRequest, { kind: "join" }>;

export function pickTableToJoin(tables: LobbyTable[], buyIn: bigint): LobbyTable | null {
  const matching = tables.filter(
    (table) => table.waiting && table.buyIn === buyIn && openSeats(table) > 0
  );
  matching.sort((a, b) => openSeats(a) - openSeats(b) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0));
  return matching[0] ?? null;
}

export function useSitDown() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const takeSeat = useTakeSeat();

  function seated(id: bigint) {
    invalidateBalanceQueries(queryClient, contracts.chips);
    void queryClient.invalidateQueries({ queryKey: ["readContract"] });
    router.push(tablePath(id));
  }

  const create = useAction({
    id: "create-table",
    working: lobbyCopy.createWorking,
    run: (report, seat: CreateRequest) => takeSeat(seat, report),
    onDone: seated,
  });

  const createPaid = useAction({
    id: "create-table",
    working: lobbyCopy.createPaidWorking,
    run: (report, seat: CreateRequest) => takeSeat(seat, report),
    onDone: seated,
  });

  const join = useAction({
    id: "join-table",
    working: lobbyCopy.joinWorking,
    run: (report, seat: JoinRequest) => takeSeat(seat, report),
    onDone: seated,
  });

  const playNow = useAction({
    id: "play-now",
    working: lobbyCopy.playNowWorking,
    run: (report, tables: LobbyTable[], buyIn: bigint) => {
      const table = pickTableToJoin(tables, buyIn);
      return takeSeat(
        table
          ? { kind: "join", tableId: table.id, buyIn }
          : { kind: "create", seatCount: PLAY_NOW_SEATS, buyIn, isPrivate: false },
        report
      );
    },
    onDone: seated,
  });

  return {
    create: (seat: CreateRequest) =>
      seat.buyIn === 0n ? create.start(seat) : createPaid.start(seat),
    join: join.start,
    playNow: playNow.start,
    creating: create.working || createPaid.working,
    findingSeat: playNow.working,
    working: create.working || createPaid.working || join.working || playNow.working,
    confirmInWallet:
      create.confirmInWallet ||
      createPaid.confirmInWallet ||
      join.confirmInWallet ||
      playNow.confirmInWallet,
  };
}
