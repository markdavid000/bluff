import { describe, expect, it } from "vitest";
import { decodeAbiParameters } from "viem";
import { ONE_CHIP } from "@/lib/chips";
import { lobbyCopy } from "../copy";
import {
  BUY_INS,
  affordProblem,
  type TableView,
  inviteLink,
  joinRequestData,
  openSeats,
  parseTableLink,
  toLobbyTable,
} from "./tables";

const view: TableView = {
  id: 12n,
  host: "0x00000000000000000000000000000000000a11ce",
  status: 1,
  isPrivate: false,
  seatCount: 3,
  playerCount: 2,
  dicePerPlayer: 3,
  diceInPlay: 0,
  buyIn: 25n * ONE_CHIP,
  createdAt: 1_700_000_000n,
  startedAt: 0n,
  deadline: 1_700_000_600n,
  round: 0,
  turn: 0,
  roundStarter: 0,
  bidQuantity: 0,
  bidFace: 0,
  bidder: 0,
  caller: 0,
};

const REQUEST = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "uint8" },
  { type: "uint64" },
  { type: "bool" },
] as const;

describe("BUY_INS", () => {
  it("offers exactly the chips to play the game allows", () => {
    expect(BUY_INS).toEqual([0n, 10n * ONE_CHIP, 25n * ONE_CHIP, 50n * ONE_CHIP]);
  });
});

describe("toLobbyTable", () => {
  it("keeps what the lobby shows, with times in milliseconds", () => {
    expect(toLobbyTable(view)).toEqual({
      id: 12n,
      host: view.host,
      waiting: true,
      isPrivate: false,
      seatCount: 3,
      playerCount: 2,
      buyIn: 25n * ONE_CHIP,
      closesAt: 1_700_000_600_000,
    });
  });

  it("is not waiting once the game has moved on", () => {
    expect(toLobbyTable({ ...view, status: 3 }).waiting).toBe(false);
  });
});

describe("openSeats", () => {
  it("counts the seats still free", () => {
    expect(openSeats(toLobbyTable(view))).toBe(1);
  });
});

describe("joinRequestData", () => {
  it("encodes creating a paid table the way the cashier reads it", () => {
    const data = joinRequestData({
      kind: "create",
      seatCount: 2,
      buyIn: 10n * ONE_CHIP,
      isPrivate: true,
    });
    expect(decodeAbiParameters(REQUEST, data)).toEqual([0, 0n, 2, 10n * ONE_CHIP, true]);
  });

  it("encodes joining a paid table by its number", () => {
    const data = joinRequestData({ kind: "join", tableId: 12n });
    expect(decodeAbiParameters(REQUEST, data)).toEqual([1, 12n, 0, 0n, false]);
  });
});

describe("table links", () => {
  it("builds an invite link back to the lobby", () => {
    expect(inviteLink("https://bluff.example", 12n)).toBe("https://bluff.example/play?join=12");
  });

  it.each([
    ["https://bluff.example/play?join=12", 12n],
    ["http://localhost:3002/play?join=7&x=1", 7n],
    ["/play?join=42", 42n],
    ["  42 ", 42n],
    ["#9", 9n],
  ])("reads %s", (input, id) => {
    expect(parseTableLink(input)).toBe(id);
  });

  it.each([
    "",
    "0",
    "-3",
    "abc",
    "https://bluff.example/play",
    "https://bluff.example/play?join=x",
    "1e3",
  ])("rejects %s", (input) => {
    expect(parseTableLink(input)).toBeNull();
  });
});

describe("affordProblem", () => {
  it("lets anyone sit at a free table, even before their chips show", () => {
    expect(affordProblem(0n, { status: "unknown" })).toBeNull();
  });

  it("asks to show the chips before playing for chips", () => {
    expect(affordProblem(10n * ONE_CHIP, { status: "unknown" })).toBe(lobbyCopy.showChipsFirst);
  });

  it("says how many chips a table needs when the player has too few", () => {
    expect(affordProblem(25n * ONE_CHIP, { status: "ready", amount: 24n * ONE_CHIP })).toBe(
      lobbyCopy.notEnough("25")
    );
  });

  it("allows a player with exactly enough", () => {
    expect(affordProblem(25n * ONE_CHIP, { status: "ready", amount: 25n * ONE_CHIP })).toBeNull();
  });
});
