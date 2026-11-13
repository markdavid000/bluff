import { tableCopy } from "../copy";
import { type Table, notReady } from "./table-view";

const MIN_PLAYERS = 2;

export type Role = "host" | "guest" | "visitor";

function joinNames(names: string[]): string {
  if (names.length === 1) return names[0] ?? "";
  return `${names.slice(0, -1).join(", ")} and ${names.at(-1)}`;
}

export function nextStep(
  table: Table,
  role: Role,
  me: string | undefined,
  nameOf: (address: string) => string
): string {
  if (table.status === "verifying") return tableCopy.checkingPaid;
  if (table.status === "playing" || table.status === "revealing") return tableCopy.gameOn;
  if (table.status !== "waiting") return tableCopy.closed;
  if (table.seats.length < MIN_PLAYERS) {
    return tableCopy.waitingForPlayers(MIN_PLAYERS - table.seats.length);
  }
  const waiting = notReady(table);
  if (waiting.length > 0) {
    const names = waiting.map((seat) =>
      seat.player.toLowerCase() === me?.toLowerCase() ? tableCopy.youInLine : nameOf(seat.player)
    );
    return tableCopy.waitingOn(joinNames(names));
  }
  return role === "host" ? tableCopy.startWhenReady : tableCopy.hostWillStart;
}
