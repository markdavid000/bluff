import { CHAIN_LAG_MS, type Table } from "@bluff/game";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import { describe, expect, it } from "vitest";
import { PARKING_LIMIT_MS, seatIntent } from "./seat-intent";

const NOW = 1_800_000_000_000;
const HOST = "0x0000000000000000000000000000000000001a2b";
const ME = "0x00000000000000000000000000000000000b0b0b";

function seat(player: string, overrides: Partial<Table["seats"][number]> = {}) {
  return {
    player: player as `0x${string}`,
    ready: false,
    isHost: player === HOST,
    isActive: true,
    ...NO_DICE,
    ...overrides,
  };
}

function table(overrides: Partial<Table> = {}): Table {
  return {
    id: 12n,
    host: HOST,
    status: "waiting",
    isPrivate: false,
    seatCount: 2,
    buyIn: 0n,
    deadline: NOW + 9 * 60_000,
    ...NO_GAME,
    seats: [seat(HOST), seat(ME)],
    ...overrides,
  };
}

function playing(turnSeat: number, overrides: Partial<Table> = {}): Table {
  return table({
    status: "playing",
    turn: turnSeat,
    deadline: NOW + 60_000,
    seats: [seat(HOST, { dice: 4 }), seat(ME, { dice: 4 })],
    ...overrides,
  });
}

const SEATED_AT = NOW - 30_000;

describe("seatIntent", () => {
  it("gets ready as soon as it sits down", () => {
    expect(seatIntent(table(), ME, NOW, SEATED_AT)).toEqual({ kind: "ready" });
  });

  it("waits for the host to start once it's ready", () => {
    expect(
      seatIntent(table({ seats: [seat(HOST), seat(ME, { ready: true })] }), ME, NOW, SEATED_AT)
    ).toEqual({ kind: "wait" });
  });

  it("gets ready again after a paid table reopens and every mark is cleared", () => {
    expect(seatIntent(table({ seats: [seat(HOST), seat(ME)] }), ME, NOW, NOW - 120_000)).toEqual({
      kind: "ready",
    });
  });

  it("leaves when the player who invited it has gone", () => {
    expect(seatIntent(table({ seats: [seat(ME, { ready: true })] }), ME, NOW, SEATED_AT)).toEqual({
      kind: "leave",
      reason: "alone",
    });
  });

  it("leaves a table that hasn't started 5 minutes after it sat down, so it can't be parked", () => {
    const ready = table({ seats: [seat(HOST), seat(ME, { ready: true })] });
    expect(seatIntent(ready, ME, NOW, NOW - PARKING_LIMIT_MS + 1)).toEqual({ kind: "wait" });
    expect(seatIntent(ready, ME, NOW, NOW - PARKING_LIMIT_MS)).toEqual({
      kind: "leave",
      reason: "not-started",
    });
  });

  it("takes its turn, with the turn's deadline", () => {
    expect(seatIntent(playing(1), ME, NOW, SEATED_AT)).toEqual({
      kind: "turn",
      deadline: NOW + 60_000,
    });
  });

  it("waits while the other player thinks", () => {
    expect(seatIntent(playing(0), ME, NOW, SEATED_AT)).toEqual({ kind: "wait" });
  });

  it("claims the other player's timeout once it's due, like any seated app", () => {
    const late = playing(0, { deadline: NOW - CHAIN_LAG_MS - 60_000 });
    expect(seatIntent(late, ME, NOW, SEATED_AT)).toMatchObject({
      kind: "keep",
      action: "claimTimeout",
    });
  });

  it("settles a reveal, like any seated app", () => {
    const revealing = playing(0, { status: "revealing", deadline: NOW + 9 * 60_000, caller: 1 });
    expect(seatIntent(revealing, ME, NOW, SEATED_AT)).toMatchObject({
      kind: "keep",
      action: "settleReveal",
    });
  });

  it("is done when the game ends, the table closes, or it no longer has a seat", () => {
    expect(seatIntent(playing(1, { status: "finished" }), ME, NOW, SEATED_AT)).toEqual({
      kind: "done",
    });
    expect(seatIntent(table({ status: "cancelled" }), ME, NOW, SEATED_AT)).toEqual({
      kind: "done",
    });
    expect(seatIntent(table({ seats: [seat(HOST)] }), ME, NOW, SEATED_AT)).toEqual({
      kind: "done",
    });
  });

  it("finds its own seat whatever the letter case of the address", () => {
    expect(
      seatIntent(playing(1), ME.toUpperCase().replace("0X", "0x"), NOW, SEATED_AT)
    ).toMatchObject({
      kind: "turn",
    });
  });
});
