"use client";

import { notFound } from "next/navigation";
import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import { TumblingDie } from "@/components/shared/tumbling-die";
import { tableCopy } from "../copy";
import { useWaitingRoom } from "../hooks/use-waiting-room";
import { BackToLobby } from "./back-to-lobby";
import { GameOnView } from "./game-on-view";
import { VisitorView } from "./visitor-view";
import { WaitingRoom } from "./waiting-room";

export function TableScreen({ id }: { id: bigint }) {
  const { read, view } = useWaitingRoom(id);

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
  if (!view) {
    return (
      <div role="status" className="flex flex-col items-center gap-6">
        <TumblingDie />
        <p className="font-game text-2xl">{tableCopy.loading}</p>
      </div>
    );
  }

  const { table, role } = view;
  if (table.status === "finished" || table.status === "cancelled") {
    return (
      <PatternFrame className="w-full max-w-xl">
        <div className="flex flex-col items-center gap-5 py-2 text-center">
          <h1 className="text-3xl">{tableCopy.closed}</h1>
          <BackToLobby />
        </div>
      </PatternFrame>
    );
  }
  if (role === "visitor") return <VisitorView room={view} />;
  if (table.status === "playing" || table.status === "revealing") {
    return (
      <GameOnView
        leaving={view.leaving}
        leavingLabel={view.confirm ? tableCopy.confirmInWallet : tableCopy.leaving}
        onLeave={view.leave}
      />
    );
  }
  return <WaitingRoom room={view} />;
}
