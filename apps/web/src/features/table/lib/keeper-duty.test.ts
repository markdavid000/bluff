import { describe, expect, it } from "vitest";
import { KEEPER_STAGGER_MS, keeperDuty } from "./keeper-duty";
import type { Table, TableStatus } from "./table-view";

const HOST = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
const ADA = "0x0000000000000000000000000000000000005e6f";
const OUTSIDER = "0x0000000000000000000000000000000000009f9f";
const DEADLINE = 1_000_000;
const CHECK_STARTED = DEADLINE - 10 * 60 * 1000;

function table(status: TableStatus, players: string[]): Table {
  return {
    id: 12n,
    host: HOST,
    status,
    isPrivate: false,
    seatCount: 3,
    buyIn: 10n,
    deadline: DEADLINE,
    seats: players.map((player) => ({
      player: player as `0x${string}`,
      ready: true,
      isHost: player === HOST,
      isActive: true,
    })),
  };
}

describe("keeperDuty", () => {
  it("has the host run the payment check at once, and the others one after another", () => {
    const checking = table("verifying", [KOLA, HOST, ADA]);
    const now = CHECK_STARTED + 500;
    expect(keeperDuty(checking, now, HOST)).toEqual({
      action: "confirmSeats",
      dueAt: CHECK_STARTED,
    });
    expect(keeperDuty(checking, now, KOLA)).toEqual({
      action: "confirmSeats",
      dueAt: CHECK_STARTED + KEEPER_STAGGER_MS,
    });
    expect(keeperDuty(checking, now, ADA)).toEqual({
      action: "confirmSeats",
      dueAt: CHECK_STARTED + 2 * KEEPER_STAGGER_MS,
    });
  });

  it("keeps the same moment to act while the clock ticks, so the move is not put off forever", () => {
    const checking = table("verifying", [HOST, KOLA]);
    expect(keeperDuty(checking, CHECK_STARTED + 5_000, KOLA)).toEqual(
      keeperDuty(checking, CHECK_STARTED + 1_000, KOLA)
    );
  });

  it("cancels a payment check that ran out of time, refunding everyone", () => {
    expect(keeperDuty(table("verifying", [HOST, KOLA]), DEADLINE + 1, KOLA)).toEqual({
      action: "cancelVerification",
      dueAt: DEADLINE + KEEPER_STAGGER_MS,
    });
  });

  it("closes a waiting table left with one player once its time is up", () => {
    expect(keeperDuty(table("waiting", [HOST]), DEADLINE + 1, HOST)).toEqual({
      action: "cancelTable",
      dueAt: DEADLINE,
    });
  });

  it("leaves a waiting table alone while there is time, or two players to start it", () => {
    expect(keeperDuty(table("waiting", [HOST]), DEADLINE - 1, HOST)).toBeNull();
    expect(keeperDuty(table("waiting", [HOST, KOLA]), DEADLINE + 1, HOST)).toBeNull();
  });

  it.each<TableStatus>(["playing", "revealing", "finished", "cancelled"])(
    "has nothing to do while a table is %s",
    (status) => {
      expect(keeperDuty(table(status, [HOST, KOLA]), DEADLINE + 1, HOST)).toBeNull();
    }
  );

  it("never has a watcher send anything", () => {
    expect(keeperDuty(table("verifying", [HOST, KOLA]), CHECK_STARTED, OUTSIDER)).toBeNull();
    expect(keeperDuty(table("verifying", [HOST, KOLA]), CHECK_STARTED, undefined)).toBeNull();
  });
});
