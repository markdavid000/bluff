import { describe, expect, it } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { type SeatView, type TableView, freeSeats, notReady, toTable } from "./table-view";

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
      buyIn: 25n * ONE_CHIP,
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
