import { isComputerPlayer } from "@/lib/computer-players";
import { tableCopy } from "../copy";

export interface TableEvent {
  eventName: string;
  args: {
    player?: string;
    host?: string;
    ready?: boolean;
  };
}

function same(a: string | undefined, b: string | undefined): boolean {
  return Boolean(a && b) && a?.toLowerCase() === b?.toLowerCase();
}

export function noticeFor(
  event: TableEvent,
  me: string | undefined,
  nameOf: (address: string) => string,
  tableHost?: string
): string | null {
  const { player, host, ready } = event.args;
  const mine = same(player, me);
  switch (event.eventName) {
    case "PlayerJoined":
      return mine || !player ? null : tableCopy.joined(nameOf(player));
    case "PlayerLeft":
      return mine || !player ? null : tableCopy.left(nameOf(player));
    case "PlayerReady":
      if (mine || !player) return null;
      return ready ? tableCopy.isReady(nameOf(player)) : tableCopy.isNotReady(nameOf(player));
    case "HostChanged":
      if (!host || isComputerPlayer(host)) return null;
      return same(host, me) ? tableCopy.youAreHost : tableCopy.isHost(nameOf(host));
    case "SeatRemoved":
      if (!player) return null;
      return mine ? tableCopy.youWereRemoved : tableCopy.removedForNotPaying(nameOf(player));
    case "TableCancelled":
      return tableCopy.tableClosed;
    case "TableReopened":
      return same(tableHost, me) ? tableCopy.openAgainForHost : tableCopy.openAgain;
    case "GameStarted":
      return tableCopy.gameStarting;
    case "TurnTimedOut":
      if (!player) return null;
      return mine ? tableCopy.youRanOutOfTime : tableCopy.ranOutOfTime(nameOf(player));
    case "PlayerEliminated":
      if (!player) return null;
      return mine ? tableCopy.youAreOut : tableCopy.isOut(nameOf(player));
    default:
      return null;
  }
}
