"use client";

import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { useState } from "react";
import { contracts } from "@/config/chain";
import { publicEnv } from "@/config/env";
import { useAction } from "@/hooks/use-action";
import { headToTable, useGoToTable } from "@/hooks/use-go-to-table";
import { type SeatRequest, useTakeSeat } from "@/hooks/use-take-seat";
import { notify } from "@/lib/notify";
import { lobbyCopy } from "../copy";
import { type ComputerOutcome, requestComputer } from "../lib/computer-seat";
import { type LobbyTable, openSeats } from "../lib/tables";

export const QUICK_PLAY_SEATS = 2;
const COMPUTER_SEATS = 2;
const COMPUTER_PATIENCE_MS = 60_000;
const PLAY_COMPUTER = "play-computer";

type From = "create" | "join" | "quick-play" | "computer";

async function callComputer(tableId: bigint): Promise<ComputerOutcome> {
  try {
    return await requestComputer({
      botUrl: publicEnv.botUrl,
      tableId,
      onWaking: () => notify.loading(lobbyCopy.wakingComputer, { id: PLAY_COMPUTER }),
    });
  } catch (error) {
    console.error("The computer gave an answer we could not read.", error);
    return { kind: "unavailable" };
  }
}

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
  const [heading, setHeading] = useState<{ id: bigint; from: From } | null>(null);

  function seated(id: bigint, from: From) {
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

  const quickPlay = useAction({
    id: "quick-play",
    working: lobbyCopy.quickPlayWorking,
    run: async (report, latestTables: () => Promise<LobbyTable[]>, buyIn: bigint) => {
      const table = pickTableToJoin(await latestTables(), buyIn);
      return takeSeat(
        table
          ? { kind: "join", tableId: table.id, buyIn }
          : { kind: "create", seatCount: QUICK_PLAY_SEATS, buyIn, isPrivate: false },
        report
      );
    },
    onDone: (id) => seated(id, "quick-play"),
  });

  const playComputer = useAction({
    id: PLAY_COMPUTER,
    working: lobbyCopy.playComputerWorking,
    patienceMs: COMPUTER_PATIENCE_MS,
    run: async (report) => {
      const id = await takeSeat(
        { kind: "create", seatCount: COMPUTER_SEATS, buyIn: 0n, isPrivate: false },
        report
      );
      headToTable(id);
      return { id, outcome: await callComputer(id) };
    },
    onDone: ({ id, outcome }) => {
      if (outcome.kind !== "seated") notify.info(lobbyCopy.computerOutcome[outcome.kind]);
      seated(id, "computer");
    },
  });

  return {
    create: (seat: CreateRequest) =>
      seat.buyIn === 0n ? create.start(seat) : createPaid.start(seat),
    join: join.start,
    quickPlay: quickPlay.start,
    playComputer: playComputer.start,
    creating: create.working || createPaid.working || heading?.from === "create",
    findingSeat: quickPlay.working || heading?.from === "quick-play",
    callingComputer: playComputer.working || heading?.from === "computer",
    working:
      heading !== null ||
      create.working ||
      createPaid.working ||
      join.working ||
      quickPlay.working ||
      playComputer.working,
    confirmInWallet:
      create.confirmInWallet ||
      createPaid.confirmInWallet ||
      join.confirmInWallet ||
      quickPlay.confirmInWallet ||
      playComputer.confirmInWallet,
  };
}
