import type { Table } from "@bluff/game";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import { describe, expect, it } from "vitest";
import { MIN_TIME_LEFT_MS, seatRefusal } from "./seat-policy";

const NOW = 1_800_000_000_000;
const HOST = "0x0000000000000000000000000000000000001a2b";
const OTHER = "0x0000000000000000000000000000000000003c4d";

function seat(player: string) {
  return {
    player: player as `0x${string}`,
    ready: false,
    isHost: player === HOST,
    isActive: true,
    ...NO_DICE,
  };
}

function quickTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 12n,
    host: HOST,
    status: "waiting",
    isPrivate: false,
    seatCount: 2,
    buyIn: 0n,
    deadline: NOW + 9 * 60_000,
    ...NO_GAME,
    seats: [seat(HOST)],
    ...overrides,
  };
}

describe("seatRefusal", () => {
  it("lets the computer sit at a new, free, public table for two with one player waiting", () => {
    expect(seatRefusal(quickTable(), NOW)).toBeNull();
  });

  it.each<[string, Partial<Table>, string]>([
    ["a game already under way", { status: "playing" }, "not-waiting"],
    ["a closed table", { status: "cancelled" }, "not-waiting"],
    ["a table that costs chips", { buyIn: 10_000_000n }, "not-free"],
    ["a private table", { isPrivate: true }, "private"],
    ["a table for three", { seatCount: 3 }, "wrong-size"],
    ["a table that's already full", { seats: [seat(HOST), seat(OTHER)] }, "full"],
    ["a table about to close", { deadline: NOW + MIN_TIME_LEFT_MS - 1 }, "too-old"],
    ["a table whose waiting time is over", { deadline: NOW - 1 }, "too-old"],
  ])("refuses %s", (_name, overrides, reason) => {
    expect(seatRefusal(quickTable(overrides), NOW)).toBe(reason);
  });

  it("gives the first reason that applies, so the answer is always the same", () => {
    expect(seatRefusal(quickTable({ status: "playing", buyIn: 10_000_000n }), NOW)).toBe(
      "not-waiting"
    );
  });
});
