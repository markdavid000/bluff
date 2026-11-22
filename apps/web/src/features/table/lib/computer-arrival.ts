import type { TableStatus } from "@bluff/game";
import type { ComputerCall } from "@/hooks/use-computer-call";
import { isComputerPlayer } from "@/lib/computer-players";
import { tableCopy } from "../copy";

export interface ArrivalTable {
  id: bigint;
  status: TableStatus;
  seats: readonly { player: string; ready: boolean }[];
}

export type Arrival =
  | { kind: "none" }
  | { kind: "working"; message: string }
  | { kind: "arrived" }
  | { kind: "refused"; message: string };

export function computerArrival(call: ComputerCall | null, table: ArrivalTable | null): Arrival {
  if (call === null || table === null || call.tableId !== table.id) return { kind: "none" };
  if (table.status !== "waiting") return { kind: "arrived" };
  const computer = table.seats.find((seat) => isComputerPlayer(seat.player));
  if (computer?.ready) return { kind: "arrived" };
  if (computer) return { kind: "working", message: tableCopy.computerGettingReady };
  if (call.outcome !== null && call.outcome.kind !== "seated") {
    return { kind: "refused", message: tableCopy.computerOutcome[call.outcome.kind] };
  }
  if (call.phase === "waking") return { kind: "working", message: tableCopy.computerWaking };
  return { kind: "working", message: tableCopy.computerJoining };
}
