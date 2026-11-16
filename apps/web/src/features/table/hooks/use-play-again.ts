"use client";

import { bluffAbi } from "@bluff/contracts";
import { useQueryClient } from "@tanstack/react-query";
import { invalidateBalanceQueries } from "@zama-fhe/sdk/query";
import { useState } from "react";
import { type Address, isAddressEqual } from "viem";
import { useReadContracts } from "wagmi";
import { contracts } from "@/config/chain";
import { useAction } from "@/hooks/use-action";
import { useChipBalance } from "@/hooks/use-chip-balance";
import { useGoToTable } from "@/hooks/use-go-to-table";
import { useNow } from "@/hooks/use-now";
import { useTakeSeat } from "@/hooks/use-take-seat";
import { type KnownBalance, formatChips, whyUnaffordable } from "@/lib/chips";
import { notify } from "@/lib/notify";
import { tableCopy } from "../copy";
import { type NewTable, newTableOffer } from "../lib/play-again";
import { toTable } from "../lib/table-view";

const CHECK_EVERY_MS = 6_000;
const LOOK_FOR_MS = 10 * 60 * 1000;

interface LastTable {
  id: bigint;
  seatCount: number;
  buyIn: bigint;
  isPrivate: boolean;
  startedAt: number;
}

interface Player {
  player: Address;
  name: string;
  isMe: boolean;
}

export function usePlayAgain({ last, players }: { last: LastTable; players: readonly Player[] }) {
  const goToTable = useGoToTable();
  const queryClient = useQueryClient();
  const takeSeat = useTakeSeat();
  const balance = useChipBalance({ working: tableCopy.gettingReady });
  const [since] = useState(() => Date.now());
  const now = useNow(CHECK_EVERY_MS);
  const looking = now < since + LOOK_FOR_MS;
  const others = players.filter((player) => !player.isMe);

  const seatsOf = useReadContracts({
    contracts: others.map(({ player }) => ({
      address: contracts.bluff,
      abi: bluffAbi,
      functionName: "tableOf",
      args: [player],
    })),
    allowFailure: false,
    query: { enabled: looking && others.length > 0, refetchInterval: CHECK_EVERY_MS },
  });
  const ids = [
    ...new Set(
      (seatsOf.isPlaceholderData ? [] : (seatsOf.data ?? []))
        .filter((id): id is bigint => typeof id === "bigint" && id !== 0n && id !== last.id)
        .map(String)
    ),
  ].map(BigInt);
  const tables = useReadContracts({
    contracts: ids.map((id) => ({
      address: contracts.bluff,
      abi: bluffAbi,
      functionName: "getTable",
      args: [id],
    })),
    allowFailure: false,
    query: { enabled: looking && ids.length > 0, refetchInterval: CHECK_EVERY_MS },
  });

  const found: NewTable[] = (tables.isPlaceholderData ? [] : (tables.data ?? [])).flatMap(
    (read) => {
      if (!Array.isArray(read)) return [];
      const [view, seats] = read;
      const table = toTable(view, seats);
      return [
        {
          id: table.id,
          host: table.host,
          status: table.status,
          seatCount: table.seatCount,
          seatsTaken: table.seats.length,
          buyIn: table.buyIn,
          isPrivate: table.isPrivate,
          createdAt: Number(view.createdAt) * 1000,
        },
      ];
    }
  );
  const match = looking
    ? newTableOffer(found, { ...last, players: others.map(({ player }) => player) })
    : null;
  const host = match
    ? others.find(({ player }) => isAddressEqual(player, match.host as Address))
    : undefined;

  const [goingTo, setGoingTo] = useState<"new" | "offer" | null>(null);

  function seated(id: bigint) {
    invalidateBalanceQueries(queryClient, contracts.chips);
    void goToTable(id).then(() => queryClient.invalidateQueries({ queryKey: ["readContract"] }));
  }

  const create = useAction({
    id: "play-again",
    working: tableCopy.playingAgain,
    run: (report) =>
      takeSeat(
        { kind: "create", seatCount: last.seatCount, buyIn: last.buyIn, isPrivate: last.isPrivate },
        report
      ),
    onDone: (id) => {
      setGoingTo("new");
      seated(id);
    },
  });
  const join = useAction({
    id: "join-new-table",
    working: tableCopy.joining,
    run: (report, tableId: bigint, buyIn: bigint) =>
      takeSeat({ kind: "join", tableId, buyIn }, report),
    onDone: (id) => {
      setGoingTo("offer");
      seated(id);
    },
  });

  const known: KnownBalance =
    balance.status === "ready"
      ? { status: "ready", amount: balance.amount }
      : { status: "unknown" };
  function affordable(buyIn: bigint): boolean {
    const problem = whyUnaffordable(buyIn, known);
    if (problem === null) return true;
    notify.error(
      problem === "show-chips" ? tableCopy.showChipsFirst : tableCopy.notEnough(formatChips(buyIn)),
      { id: "play-again" }
    );
    return false;
  }

  return {
    offer:
      match && host
        ? { id: match.id, hostName: host.name, buyIn: match.buyIn, isPrivate: match.isPrivate }
        : null,
    playAgain: () => {
      if (affordable(last.buyIn)) create.start();
    },
    joinOffer: () => {
      if (match && !match.isPrivate && affordable(match.buyIn)) join.start(match.id, match.buyIn);
    },
    playing: create.working || goingTo === "new",
    joining: join.working || goingTo === "offer",
    busy: create.working || join.working || goingTo !== null,
    confirm: create.confirmInWallet || join.confirmInWallet,
  };
}
