import { describe, expect, it } from "vitest";
import { COMPUTER_PLAYERS } from "@/config/computer-players";
import { ONE_CHIP } from "@/lib/chips";
import { lobbyCopy } from "../copy";
import {
  BUY_INS,
  affordProblem,
  othersTables,
  peopleTables,
  type TableView,
  joinable,
  openSeats,
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

describe("joinable", () => {
  const table = toLobbyTable(view);
  const closesAt = table.closesAt;

  it("offers a waiting table with a free seat and time left", () => {
    expect(joinable(table, closesAt - 5 * 60_000)).toBe(true);
  });

  it("skips a table whose time is up, or about to be", () => {
    expect(joinable(table, closesAt + 1)).toBe(false);
    expect(joinable(table, closesAt - 30_000)).toBe(false);
  });

  it("skips a full table and one already playing", () => {
    expect(joinable({ ...table, playerCount: 3 }, closesAt - 5 * 60_000)).toBe(false);
    expect(joinable({ ...table, waiting: false }, closesAt - 5 * 60_000)).toBe(false);
  });
});

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
      createdAt: 1_700_000_000_000,
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

describe("othersTables", () => {
  it("leaves out the player's own table, so a table they just made never counts as open to them", () => {
    const mine = toLobbyTable(view);
    const theirs = toLobbyTable({
      ...view,
      id: 13n,
      host: "0x0000000000000000000000000000000000003c4d",
    });
    expect(othersTables([mine, theirs], "0x00000000000000000000000000000000000A11CE")).toEqual([
      theirs,
    ]);
  });

  it("keeps every table while the player's address isn't known yet", () => {
    const mine = toLobbyTable(view);
    expect(othersTables([mine], undefined)).toEqual([mine]);
  });
});

describe("peopleTables", () => {
  it("leaves out a table a computer was left holding after its person left", () => {
    const computer = COMPUTER_PLAYERS[0] ?? view.host;
    const left = toLobbyTable({ ...view, id: 13n, host: computer, playerCount: 1 });
    const open = toLobbyTable(view);
    expect(peopleTables([left, open])).toEqual([open]);
  });
});
