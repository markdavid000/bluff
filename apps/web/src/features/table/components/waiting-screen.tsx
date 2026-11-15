"use client";

import { PatternFrame } from "@/components/shared/pattern-band";
import { tableCopy } from "../copy";
import { useWaitingRoom } from "../hooks/use-waiting-room";
import { BackToLobby } from "./back-to-lobby";
import { VisitorView } from "./visitor-view";
import { TableLoading } from "./table-loading";
import { WaitingRoom } from "./waiting-room";

export function WaitingScreen({ id }: { id: bigint }) {
  const { view } = useWaitingRoom(id);

  if (!view) return <TableLoading />;

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
  return <WaitingRoom room={view} />;
}
