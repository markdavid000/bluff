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

  describe("in a game", () => {
    const ADA = "0x0000000000000000000000000000000000005e6f";
    const names = (address: string) =>
      address.toLowerCase() === KOLA
        ? "Kola #3C4D"
        : address.toLowerCase() === ADA
          ? "Ada #5E6F"
          : "Me";

    it("leaves bids and calls to the table itself, without passing toasts", () => {
      expect(noticeFor({ eventName: "BidPlaced", args: { player: KOLA } }, ME, names)).toBeNull();
      expect(noticeFor({ eventName: "BluffCalled", args: { player: KOLA } }, ME, names)).toBeNull();
    });

    it("says who ran out of time, and when it was you", () => {
      expect(noticeFor({ eventName: "TurnTimedOut", args: { player: KOLA } }, ME, names)).toBe(
        tableCopy.ranOutOfTime("Kola #3C4D")
      );
      expect(noticeFor({ eventName: "TurnTimedOut", args: { player: ME } }, ME, names)).toBe(
        tableCopy.youRanOutOfTime
      );
    });

    it("says who is out of the game, and when it was you", () => {
      expect(noticeFor({ eventName: "PlayerEliminated", args: { player: KOLA } }, ME, names)).toBe(
        tableCopy.isOut("Kola #3C4D")
      );
      expect(noticeFor({ eventName: "PlayerEliminated", args: { player: ME } }, ME, names)).toBe(
        tableCopy.youAreOut
      );
    });

    it("leaves round results and the end of the game to their own tiles", () => {
      expect(noticeFor({ eventName: "RoundSettled", args: {} }, ME, names)).toBeNull();
      expect(noticeFor({ eventName: "GameEnded", args: {} }, ME, names)).toBeNull();
    });
  });
});
