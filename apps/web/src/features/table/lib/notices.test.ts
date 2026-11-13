import { describe, expect, it } from "vitest";
import { tableCopy } from "../copy";
import { type TableEvent, noticeFor } from "./notices";

const ME = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";

const nameOf = (address: string) => (address.toLowerCase() === KOLA ? "Kola #3C4D" : "Me");

function notice(event: TableEvent) {
  return noticeFor(event, ME, nameOf);
}

describe("noticeFor", () => {
  it.each<[TableEvent, string]>([
    [{ eventName: "PlayerJoined", args: { player: KOLA } }, tableCopy.joined("Kola #3C4D")],
    [{ eventName: "PlayerLeft", args: { player: KOLA } }, tableCopy.left("Kola #3C4D")],
    [
      { eventName: "PlayerReady", args: { player: KOLA, ready: true } },
      tableCopy.isReady("Kola #3C4D"),
    ],
    [
      { eventName: "PlayerReady", args: { player: KOLA, ready: false } },
      tableCopy.isNotReady("Kola #3C4D"),
    ],
    [{ eventName: "HostChanged", args: { host: KOLA } }, tableCopy.isHost("Kola #3C4D")],
    [
      { eventName: "SeatRemoved", args: { player: KOLA } },
      tableCopy.removedForNotPaying("Kola #3C4D"),
    ],
    [{ eventName: "TableCancelled", args: {} }, tableCopy.tableClosed],
    [{ eventName: "SeatVerificationStarted", args: {} }, tableCopy.checkingPaid],
    [{ eventName: "TableReopened", args: {} }, tableCopy.openAgain],
    [{ eventName: "GameStarted", args: {} }, tableCopy.gameStarting],
  ])("tells the table about %o", (event, words) => {
    expect(notice(event)).toBe(words);
  });

  it.each<TableEvent>([
    { eventName: "PlayerJoined", args: { player: ME } },
    { eventName: "PlayerLeft", args: { player: ME } },
    { eventName: "PlayerReady", args: { player: ME, ready: true } },
  ])("never echoes the player's own move: %o", (event) => {
    expect(notice(event)).toBeNull();
  });

  it("tells a player when they become the host or were removed", () => {
    expect(notice({ eventName: "HostChanged", args: { host: ME } })).toBe(tableCopy.youAreHost);
    expect(notice({ eventName: "SeatRemoved", args: { player: ME } })).toBe(
      tableCopy.youWereRemoved
    );
  });

  it("stays quiet about moves that are not about who is at the table", () => {
    expect(notice({ eventName: "BidPlaced", args: { player: KOLA } })).toBeNull();
  });
});
