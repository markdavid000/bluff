"use client";

import { useState } from "react";
import { useChipBalance } from "@/hooks/use-chip-balance";
import { notify } from "@/lib/notify";
import { lobbyCopy } from "../copy";
import {
  BUY_INS,
  type KnownBalance,
  type SeatCount,
  affordProblem,
  inviteLink,
  openSeats,
} from "../lib/tables";
import { useJoinLink } from "./use-join-link";
import { useLeaveTable } from "./use-leave-table";
import { useMyTableId } from "./use-my-table-id";
import { useOpenTables } from "./use-open-tables";
import { useSitDown } from "./use-sit-down";
import { useTable } from "./use-table";

const WAITING = 1;

export function useLobby({ invitedId }: { invitedId: bigint | null }) {
  const [buyIn, setBuyIn] = useState<bigint>(BUY_INS[0]);
  const [invited, setInvited] = useState<bigint | null>(invitedId);
  const [createOpen, setCreateOpen] = useState(false);
  const [tablesOpen, setTablesOpen] = useState(false);

  const joinLink = useJoinLink({ onFound: setInvited });
  const balance = useChipBalance({ working: lobbyCopy.openingChips });
  const known: KnownBalance =
    balance.status === "ready"
      ? { status: "ready", amount: balance.amount }
      : { status: "unknown" };
  const openTables = useOpenTables();
  const myTableId = useMyTableId();
  const myTable = useTable(myTableId.status === "ready" ? myTableId.id : null);
  const invitedTable = useTable(invited);
  const sitDown = useSitDown({
    onSeated: () => {
      setCreateOpen(false);
      setTablesOpen(false);
      setInvited(null);
    },
  });
  const leaveTable = useLeaveTable();

  const tables = openTables.status === "ready" ? openTables.tables : [];

  return {
    buyIn,
    chooseBuyIn: setBuyIn,
    buyInProblem: affordProblem(buyIn, known),
    problemFor: (tableBuyIn: bigint) => affordProblem(tableBuyIn, known),
    openTables,
    myTableId,
    myTable,
    invited: invited === null ? null : { id: invited, read: invitedTable },
    invitedProblem:
      invitedTable.status === "ready"
        ? invitedTable.seated.status !== WAITING
          ? lobbyCopy.invitedGone
          : openSeats(invitedTable.seated.table) === 0
            ? lobbyCopy.invitedFull
            : affordProblem(invitedTable.seated.table.buyIn, known)
        : null,
    dismissInvite: () => setInvited(null),
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
    leaveTable,
    playNow: () => sitDown.playNow(tables, buyIn),
    createTable: (seatCount: SeatCount, isPrivate: boolean) =>
      sitDown.create({ kind: "create", seatCount, buyIn, isPrivate }),
    copyInvite: (id: bigint) => {
      const link = inviteLink(window.location.origin, id);
      navigator.clipboard.writeText(link).then(
        () => notify.success(lobbyCopy.inviteCopied, { id: "invite" }),
        (error: unknown) => {
          console.error("The invite link could not be copied.", error);
          notify.error(lobbyCopy.inviteCopyProblem, { id: "invite" });
        }
      );
    },
  };
}
