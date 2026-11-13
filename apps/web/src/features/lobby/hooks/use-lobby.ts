"use client";

import { useState } from "react";
import { useChipBalance } from "@/hooks/use-chip-balance";
import type { KnownBalance } from "@/lib/chips";
import { lobbyCopy } from "../copy";
import { BUY_INS, type SeatCount, affordProblem } from "../lib/tables";
import { useJoinLink } from "./use-join-link";
import { useMyTableId } from "./use-my-table-id";
import { useOpenTables } from "./use-open-tables";
import { useSitDown } from "./use-sit-down";

export function useLobby() {
  const [buyIn, setBuyIn] = useState<bigint>(BUY_INS[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(false);

  const joinLink = useJoinLink();
  const balance = useChipBalance({ working: lobbyCopy.openingChips });
  const known: KnownBalance =
    balance.status === "ready"
      ? { status: "ready", amount: balance.amount }
      : { status: "unknown" };
  const openTables = useOpenTables();
  const myTableId = useMyTableId();
  const sitDown = useSitDown();
  const tables = openTables.status === "ready" ? openTables.tables : [];

  return {
    buyIn,
    chooseBuyIn: setBuyIn,
    buyInProblem: affordProblem(buyIn, known),
    problemFor: (tableBuyIn: bigint) => affordProblem(tableBuyIn, known),
    openTables,
    myTableId,
    joinLink,
    createOpen,
    setCreateOpen,
    tablesOpen,
    setTablesOpen,
    createFromTables: () => {
      setTablesOpen(false);
      setCreateOpen(true);
    },
    sitDown,
    playNow: () => sitDown.playNow(tables, buyIn),
    createTable: (seatCount: SeatCount, isPrivate: boolean) =>
      sitDown.create({ kind: "create", seatCount, buyIn, isPrivate }),
  };
}
