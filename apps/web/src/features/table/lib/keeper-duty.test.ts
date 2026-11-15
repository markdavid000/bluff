import { describe, expect, it } from "vitest";
import { CHAIN_LAG_MS, KEEPER_STAGGER_MS, keeperDuty } from "./keeper-duty";
import type { Table, TableStatus } from "./table-view";
import { NO_DICE, NO_GAME } from "./table-fixture.testing";

const HOST = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
const ADA = "0x0000000000000000000000000000000000005e6f";
const OUTSIDER = "0x0000000000000000000000000000000000009f9f";
const DEADLINE = 1_000_000;
const CHECK_STARTED = DEADLINE - 10 * 60 * 1000;
const AFTER = DEADLINE + CHAIN_LAG_MS + 1;
const DUE = DEADLINE + CHAIN_LAG_MS;

function table(status: TableStatus, players: string[]): Table {
  return {
    id: 12n,
    host: HOST,
    status,
    isPrivate: false,
    seatCount: 3,
    buyIn: 10n,
    deadline: DEADLINE,
    ...NO_GAME,
    seats: players.map((player) => ({
      player: player as `0x${string}`,
      ready: true,
      isHost: player === HOST,
      isActive: true,
      ...NO_DICE,
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
    expect(keeperDuty(table("verifying", [HOST, KOLA]), AFTER, KOLA)).toEqual({
      action: "cancelVerification",
      dueAt: DUE + KEEPER_STAGGER_MS,
    });
  });

  it("closes a waiting table left with one player once its time is up", () => {
    expect(keeperDuty(table("waiting", [HOST]), AFTER, HOST)).toEqual({
      action: "cancelTable",
      dueAt: DUE,
    });
  });

  it("leaves a waiting table alone while there is time, or two players to start it", () => {
    expect(keeperDuty(table("waiting", [HOST]), DEADLINE - 1, HOST)).toBeNull();
    expect(keeperDuty(table("waiting", [HOST, KOLA]), AFTER, HOST)).toBeNull();
  });

  it.each<TableStatus>(["finished", "cancelled"])(
    "has nothing to do once a table is %s",
    (status) => {
      expect(keeperDuty(table(status, [HOST, KOLA]), AFTER, HOST)).toBeNull();
    }
  );

  describe("during a game", () => {
    const CALLED_AT = DEADLINE - 10 * 60 * 1000;

    function knockedOut(game: Table, player: string): Table {
      return {
        ...game,
        seats: game.seats.map((seat) =>
          seat.player === player ? { ...seat, isActive: false } : seat
        ),
      };
    }

    it("settles a called round at once, players still in going first in seat order", () => {
      const revealing = knockedOut(table("revealing", [HOST, KOLA, ADA]), KOLA);
      const now = CALLED_AT + 500;
      expect(keeperDuty(revealing, now, HOST)).toEqual({
        action: "settleReveal",
        dueAt: CALLED_AT,
      });
      expect(keeperDuty(revealing, now, ADA)).toEqual({
        action: "settleReveal",
        dueAt: CALLED_AT + KEEPER_STAGGER_MS,
      });
      expect(keeperDuty(revealing, now, KOLA)).toEqual({
        action: "settleReveal",
        dueAt: CALLED_AT + 2 * KEEPER_STAGGER_MS,
      });
    });

    it("cancels a reveal that never arrived, sharing the pot", () => {
      expect(keeperDuty(table("revealing", [HOST, KOLA]), AFTER, KOLA)).toEqual({
        action: "cancelStuckReveal",
        dueAt: DUE + KEEPER_STAGGER_MS,
      });
    });

    it("gives the chain a block to see a deadline pass before claiming it", () => {
      expect(keeperDuty(table("playing", [HOST, KOLA]), DEADLINE + 1, HOST)).toBeNull();
      expect(keeperDuty(table("playing", [HOST, KOLA]), DEADLINE + CHAIN_LAG_MS, HOST)).toBeNull();
    });

    it("claims a turn that ran out of time, and waits while there is time", () => {
      const playing = table("playing", [HOST, KOLA]);
      expect(keeperDuty(playing, DUE, HOST)).toBeNull();
      expect(keeperDuty(playing, AFTER, HOST)).toEqual({
        action: "claimTimeout",
        dueAt: DUE,
      });
      expect(keeperDuty(playing, AFTER, KOLA)).toEqual({
        action: "claimTimeout",
        dueAt: DUE + KEEPER_STAGGER_MS,
      });
    });

    it("never has a watcher send anything", () => {
      expect(keeperDuty(table("revealing", [HOST, KOLA]), CALLED_AT, OUTSIDER)).toBeNull();
      expect(keeperDuty(table("playing", [HOST, KOLA]), AFTER, OUTSIDER)).toBeNull();
    });
  });

  it("never has a watcher send anything", () => {
    expect(keeperDuty(table("verifying", [HOST, KOLA]), CHECK_STARTED, OUTSIDER)).toBeNull();
    expect(keeperDuty(table("verifying", [HOST, KOLA]), CHECK_STARTED, undefined)).toBeNull();
  });
});
