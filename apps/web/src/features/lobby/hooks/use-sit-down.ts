"use client";

import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { useState } from "react";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useGoToTable } from "@/hooks/use-go-to-table";
import { type SeatRequest, useTakeSeat } from "@/hooks/use-take-seat";
import { lobbyCopy } from "../copy";
import { type LobbyTable, openSeats } from "../lib/tables";

export const PLAY_NOW_SEATS = 2;

type CreateRequest = Extract<SeatRequest, { kind: "create" }>;
type JoinRequest = Extract<SeatRequest, { kind: "join" }>;

export function pickTableToJoin(tables: LobbyTable[], buyIn: bigint): LobbyTable | null {
  const matching = tables.filter(
    (table) => table.waiting && table.buyIn === buyIn && openSeats(table) > 0
  );
  matching.sort((a, b) => openSeats(a) - openSeats(b) || a.createdAt - b.createdAt);
  return matching[0] ?? null;
}

export function useSitDown() {
  const queryClient = useQueryClient();
  const takeSeat = useTakeSeat();
  const goToTable = useGoToTable();
  const [heading, setHeading] = useState<{
    id: bigint;
    from: "create" | "join" | "play-now";
  } | null>(null);

  function seated(id: bigint, from: "create" | "join" | "play-now") {
    setHeading({ id, from });
    invalidateBalanceQueries(queryClient, contracts.chips);
    void goToTable(id).then(() => queryClient.invalidateQueries({ queryKey: ["readContract"] }));
  }

  const create = useAction({
    id: "create-table",
    working: lobbyCopy.createWorking,
    run: (report, seat: CreateRequest) => takeSeat(seat, report),
    onDone: (id) => seated(id, "create"),
  });

  const createPaid = useAction({
    id: "create-table",
    working: lobbyCopy.createPaidWorking,
    run: (report, seat: CreateRequest) => takeSeat(seat, report),
    onDone: (id) => seated(id, "create"),
  });

  const join = useAction({
    id: "join-table",
    working: lobbyCopy.joinWorking,
    run: (report, seat: JoinRequest) => takeSeat(seat, report),
    onDone: (id) => seated(id, "join"),
  });

  const playNow = useAction({
    id: "play-now",
    working: lobbyCopy.playNowWorking,
    run: async (report, latestTables: () => Promise<LobbyTable[]>, buyIn: bigint) => {
      const table = pickTableToJoin(await latestTables(), buyIn);
      return takeSeat(
        table
          ? { kind: "join", tableId: table.id, buyIn }
          : { kind: "create", seatCount: PLAY_NOW_SEATS, buyIn, isPrivate: false },
        report
      );
    },
    onDone: (id) => seated(id, "play-now"),
  });

  return {
    create: (seat: CreateRequest) =>
      seat.buyIn === 0n ? create.start(seat) : createPaid.start(seat),
    join: join.start,
    playNow: playNow.start,
    creating: create.working || createPaid.working || heading?.from === "create",
    findingSeat: playNow.working || heading?.from === "play-now",
    working:
      heading !== null || create.working || createPaid.working || join.working || playNow.working,
    goingTo: heading?.id ?? null,
    confirmInWallet:
      create.confirmInWallet ||
      createPaid.confirmInWallet ||
      join.confirmInWallet ||
      playNow.confirmInWallet,
  };
}
