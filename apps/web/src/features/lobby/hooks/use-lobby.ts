"use client";

import { useState } from "react";
import { useChipBalance } from "@/hooks/use-chip-balance";
import { useMyTableId } from "@/hooks/use-my-table-id";
import type { KnownBalance } from "@/lib/chips";
import { lobbyCopy } from "../copy";
import { BUY_INS, type SeatCount, affordProblem } from "../lib/tables";
import { useGamesInPlay } from "./use-games-in-play";
import { useJoinLink } from "./use-join-link";
import { useLatestOpenTables, useOpenTables } from "./use-open-tables";
import { useSitDown } from "./use-sit-down";

export function useLobby() {
  const [buyIn, setBuyIn] = useState<bigint>(BUY_INS[0]);
  const [createOpen, setCreateOpen] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(false);
  const [watchOpen, setWatchOpen] = useState(false);
  const gamesInPlay = useGamesInPlay();

  const joinLink = useJoinLink();
  const balance = useChipBalance({ working: lobbyCopy.openingChips });
  const known: KnownBalance =
    balance.status === "ready"
      ? { status: "ready", amount: balance.amount }
      : { status: "unknown" };
  const openTables = useOpenTables();
  const latestOpenTables = useLatestOpenTables();
  const myTableId = useMyTableId();
  const sitDown = useSitDown();

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
    gamesInPlay,
    watchOpen,
    setWatchOpen,
    createFromTables: () => {
      setTablesOpen(false);
      setCreateOpen(true);
    },
    sitDown,
    quickPlay: () => sitDown.quickPlay(latestOpenTables, buyIn),
    createTable: (seatCount: SeatCount, isPrivate: boolean) =>
      sitDown.create({ kind: "create", seatCount, buyIn, isPrivate }),
  };
}
