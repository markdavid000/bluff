import { describe, expect, it } from "vitest";
import { type SeatView, type TableView, freeSeats, notReady, toTable } from "./table-view";

const BUY_IN = 25_000_000n;

const HOST = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
const ADA = "0x0000000000000000000000000000000000005e6f";

const view: TableView = {
  id: 12n,
  host: HOST,
  status: 1,
  isPrivate: false,
  seatCount: 4,
  playerCount: 3,
  dicePerPlayer: 2,
  diceInPlay: 0,
  buyIn: BUY_IN,
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

function seat(player: `0x${string}`, ready: boolean): SeatView {
  return { player, dice: 0, missedTurns: 0, isActive: true, ready };
}

describe("toTable", () => {
  it("names the status and keeps what the waiting room shows", () => {
    const table = toTable(view, [seat(HOST, false), seat(KOLA, true), seat(ADA, false)]);
    expect(table).toMatchObject({
      id: 12n,
      host: HOST,
      status: "waiting",
      seatCount: 4,
      buyIn: BUY_IN,
      deadline: 1_700_000_600_000,
    });
    expect(table.seats.map((entry) => [entry.player, entry.ready, entry.isHost])).toEqual([
      [HOST, false, true],
      [KOLA, true, false],
      [ADA, false, false],
    ]);
  });

  it.each([
    [1, "waiting"],
    [2, "verifying"],
    [3, "playing"],
    [4, "revealing"],
    [5, "finished"],
    [6, "cancelled"],
  ] as const)("reads status %i as %s", (status, name) => {
    expect(toTable({ ...view, status }, []).status).toBe(name);
  });
});

describe("the game", () => {
  const playing: TableView = {
    ...view,
    status: 3,
    diceInPlay: 7,
    startedAt: 1_700_000_100n,
    deadline: 1_700_000_145n,
    round: 3,
    turn: 2,
    roundStarter: 1,
    bidQuantity: 4,
    bidFace: 5,
    bidder: 1,
    caller: 0,
  };

  function inGame(player: `0x${string}`, dice: number, missedTurns = 0, isActive = true): SeatView {
    return { player, dice, missedTurns, isActive, ready: false };
  }

  it("keeps the round, the turn, the bid and who made it", () => {
    const table = toTable(playing, [inGame(HOST, 2), inGame(KOLA, 3, 1), inGame(ADA, 2)]);
    expect(table).toMatchObject({
      status: "playing",
      dicePerPlayer: 2,
      diceInPlay: 7,
      startedAt: 1_700_000_100_000,
      round: 3,
      turn: 2,
      roundStarter: 1,
      bid: { quantity: 4, face: 5, bidder: 1 },
      caller: null,
    });
    expect(table.seats.map((entry) => [entry.dice, entry.missedTurns])).toEqual([
      [2, 0],
      [3, 1],
      [2, 0],
    ]);
  });

  it("has no bid at the start of a round", () => {
    expect(toTable({ ...playing, bidQuantity: 0, bidFace: 0 }, []).bid).toBeNull();
  });

  it("knows who called while the dice are revealed", () => {
    expect(toTable({ ...playing, status: 4, caller: 2 }, []).caller).toBe(2);
  });

  it("keeps a player who is out of the game, with no dice", () => {
    const table = toTable(playing, [inGame(HOST, 0, 2, false), inGame(KOLA, 3)]);
    expect(table.seats[0]).toMatchObject({ isActive: false, dice: 0, missedTurns: 2 });
  });

  it("refuses a bid on a face the game doesn't allow", () => {
    expect(() => toTable({ ...playing, bidFace: 1 }, [])).toThrow(/bid/);
    expect(() => toTable({ ...playing, seatCount: 5 }, [])).toThrow(/seats/);
  });
});

describe("waiting room helpers", () => {
  it("counts the free seats", () => {
    expect(freeSeats(toTable(view, [seat(HOST, false), seat(KOLA, true), seat(ADA, false)]))).toBe(
      1
    );
  });

  it("lists who still has to get ready, never the host", () => {
    const table = toTable(view, [seat(HOST, false), seat(KOLA, true), seat(ADA, false)]);
    expect(notReady(table).map((entry) => entry.player)).toEqual([ADA]);
  });
});
