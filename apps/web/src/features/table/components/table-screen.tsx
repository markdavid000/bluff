"use client";

import { usePrivy } from "@privy-io/react-auth";
import { notFound } from "next/navigation";
import { ActionButton } from "@/components/shared/action-button";
import { tableCopy } from "../copy";
import { useTable } from "../hooks/use-table";
import { GameScreen } from "./game-screen";
import { TableLoading } from "./table-loading";
import { WaitingScreen } from "./waiting-screen";

const IN_GAME = new Set(["playing", "revealing", "finished"]);

export function TableScreen({ id }: { id: bigint }) {
  const read = useTable(id);
  const { user } = usePrivy();
  const me = user?.wallet?.address?.toLowerCase();

  if (read.status === "not-found") notFound();
  if (read.status === "failed") {
    return (
      <div className="flex flex-col items-center gap-5 text-center">
        <p className="font-game text-2xl">{tableCopy.problem}</p>
        <ActionButton tone="quiet" icon="target" onClick={read.retry}>
          {tableCopy.tryAgain}
        </ActionButton>
      </div>
    );
  }
  if (read.status !== "ready") return <TableLoading />;

  const seated = read.table.seats.some((seat) => seat.player.toLowerCase() === me);
  return seated && IN_GAME.has(read.table.status) ? (
    <GameScreen id={id} />
  ) : (
    <WaitingScreen id={id} />
  );
}
