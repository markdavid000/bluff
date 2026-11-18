import type { Table } from "@bluff/game";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import type { Address } from "viem";
import { describe, expect, it } from "vitest";
import { MoveRefused, TableMissing } from "./chain-errors";
import { createLog } from "./log";
import type { Acquired, PlayerPool } from "./player-pool";
import type { BluffCall } from "./seat-runner";
import { type ServiceChain, createSeatService } from "./seat-service";

const NOW = 1_800_000_000_000;
const HOST = "0x0000000000000000000000000000000000001a2b" as Address;
const BABA = {
  index: 1,
  address: "0x00000000000000000000000000000000000b0b0b" as Address,
  name: "Baba Dice",
};

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
    seats: [{ player: HOST, ready: false, isHost: true, isActive: true, ...NO_DICE }],
    ...overrides,
  };
}

function harness({
  read,
  acquired = { kind: "player", player: BABA },
  join,
}: {
  read?: () => Promise<Table>;
  acquired?: Acquired;
  join?: () => Promise<{ blockNumber: bigint }>;
} = {}) {
  const sent: { index: number; call: BluffCall }[] = [];
  const released: number[] = [];
  const started: { index: number; tableId: bigint; seatedAt: number; seatedBlock: bigint }[] = [];
  let waited = 0;
  const chain: ServiceChain = {
    readTable: read ?? (async () => quickTable()),
    send: async (index, call) => {
      sent.push({ index, call });
      return join ? join() : { blockNumber: 200n };
    },
    balanceOf: async () => 10n ** 17n,
  };
  const pool = {
    acquire: async () => acquired,
    release: (index: number) => void released.push(index),
    known: () => [{ ...BABA, busy: true }],
  } as unknown as PlayerPool;
  const service = createSeatService({
    bank: "0x00000000000000000000000000000000000000b0",
    chain,
    pool,
    startRunner: (player, tableId, seatedAt, seatedBlock) =>
      void started.push({ index: player.index, tableId, seatedAt, seatedBlock }),
    now: () => NOW,
    sleep: async (ms) => {
      waited += ms;
    },
    log: createLog(() => undefined),
  });
  return { service, sent, released, started, waited: () => waited };
}

describe("seat service", () => {
  it("joins the table with a free player and starts playing", async () => {
    const h = harness();
    expect(await h.service.seat(12n)).toEqual({ kind: "seated", player: BABA.address });
    expect(h.sent).toEqual([{ index: 1, call: { functionName: "joinFreeTable", args: [12n] } }]);
    expect(h.started).toEqual([{ index: 1, tableId: 12n, seatedAt: NOW, seatedBlock: 200n }]);
  });

  it("refuses a table that doesn't qualify, without using a player", async () => {
    const h = harness({ read: async () => quickTable({ buyIn: 10_000_000n }) });
    expect(await h.service.seat(12n)).toEqual({ kind: "refused", reason: "not-free" });
    expect(h.sent).toEqual([]);
  });

  it("refuses a table that still doesn't exist after waiting a block for the network", async () => {
    const h = harness({ read: async () => Promise.reject(new TableMissing(12n)) });
    expect(await h.service.seat(12n)).toEqual({ kind: "refused", reason: "not-found" });
    expect(h.waited()).toBeGreaterThanOrEqual(12_000);
  });

  it("waits for a lagging network to see a table that was only just made", async () => {
    let reads = 0;
    const h = harness({
      read: async () => (++reads < 3 ? Promise.reject(new TableMissing(12n)) : quickTable()),
    });
    expect(await h.service.seat(12n)).toEqual({ kind: "seated", player: BABA.address });
  });

  it.each<[Acquired["kind"], string]>([
    ["all-busy", "all-busy"],
    ["resting", "resting"],
  ])("says when no player can sit down (%s)", async (kind, reason) => {
    const h = harness({ acquired: { kind } as Acquired });
    expect(await h.service.seat(12n)).toEqual({ kind: "refused", reason });
  });

  it.each([
    ["TableFull", "full"],
    ["WrongStatus", "not-waiting"],
  ])(
    "frees the player and refuses when a person beat it to the seat (%s)",
    async (errorName, reason) => {
      const h = harness({ join: async () => Promise.reject(new MoveRefused(errorName, null)) });
      expect(await h.service.seat(12n)).toEqual({ kind: "refused", reason });
      expect(h.released).toEqual([1]);
      expect(h.started).toEqual([]);
    }
  );

  it("frees the player and passes on any other failure to join", async () => {
    const h = harness({ join: async () => Promise.reject(new Error("rpc down")) });
    await expect(h.service.seat(12n)).rejects.toThrow("rpc down");
    expect(h.released).toEqual([1]);
  });

  it("reports the bank and each player's balance for the health check", async () => {
    const h = harness();
    expect(await h.service.health()).toEqual({
      bank: { address: "0x00000000000000000000000000000000000000b0", balance: "0.1" },
      players: [{ address: BABA.address, name: "Baba Dice", busy: true, balance: "0.1" }],
    });
  });
});
