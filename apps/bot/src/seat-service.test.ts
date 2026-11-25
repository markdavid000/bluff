import type { Table } from "@bluff/game";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import type { Address } from "viem";
import { describe, expect, it } from "vitest";
import { MoveRefused, TableMissing } from "./chain-errors";
import { createLog } from "./log";
import type { Acquired, PlayerPool } from "./player-pool";
import { type Seated, type ServiceChain, createSeatService } from "./seat-service";

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
  join?: () => Promise<Seated>;
} = {}) {
  const sent: { index: number; tableId: bigint; atBlock: bigint }[] = [];
  const readAt: (bigint | undefined)[] = [];
  const waits: number[] = [];
  const released: number[] = [];
  const started: { index: number; tableId: bigint; seatedAt: number; seatedBlock: bigint }[] = [];
  let waited = 0;
  const chain: ServiceChain = {
    blockNumber: async () => 150n,
    readTable: async (id, atBlock) => {
      readAt.push(atBlock);
      return read ? read() : quickTable();
    },
    joinAndReady: async (index, tableId, atBlock) => {
      sent.push({ index, tableId, atBlock });
      return join ? join() : { joinedBlock: 200n, readyBlock: 200n };
    },
    balanceOf: async () => 10n ** 17n,
  };
  const spares: number[] = [];
  const pool = {
    acquire: async () => acquired,
    ensureSpare: async () => void spares.push(1),
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
      waits.push(ms);
    },
    log: createLog(() => undefined),
  });
  return { service, sent, released, started, readAt, waits, spares, waited: () => waited };
}

describe("seat service", () => {
  it("joins and gets ready in one go with a free player, then starts playing", async () => {
    const h = harness({ join: async () => ({ joinedBlock: 200n, readyBlock: 200n }) });
    expect(await h.service.seat(12n)).toEqual({ kind: "seated", player: BABA.address });
    expect(h.sent).toEqual([{ index: 1, tableId: 12n, atBlock: 150n }]);
    expect(h.started).toEqual([{ index: 1, tableId: 12n, seatedAt: NOW, seatedBlock: 200n }]);
  });

  it("starts readying the next computer as soon as it hands one out, while this one joins", async () => {
    let sparesAtJoin = -1;
    const h = harness({
      join: async () => {
        sparesAtJoin = h.spares.length;
        return { joinedBlock: 200n, readyBlock: 200n };
      },
    });
    await h.service.seat(12n);
    expect(sparesAtJoin).toBe(1);
    expect(h.spares).toHaveLength(1);
  });

  it("readies no spare when no computer was handed out", async () => {
    const h = harness({ acquired: { kind: "all-busy" } });
    await h.service.seat(12n);
    expect(h.spares).toEqual([]);
  });

  it("still reports the seat when getting ready fails, leaving the seat to get ready itself", async () => {
    const h = harness({ join: async () => ({ joinedBlock: 200n, readyBlock: null }) });
    expect(await h.service.seat(12n)).toEqual({ kind: "seated", player: BABA.address });
    expect(h.started).toEqual([{ index: 1, tableId: 12n, seatedAt: NOW, seatedBlock: 200n }]);
  });

  it("reads the table and checks the join at the same, newest block, so a lagging server can't refuse it", async () => {
    const h = harness();
    await h.service.seat(12n);
    expect(h.readAt).toEqual([150n]);
    expect(h.sent[0]?.atBlock).toBe(150n);
  });

  it("tries the join again when a server stumbles, rather than giving up at once", async () => {
    let calls = 0;
    const h = harness({
      join: async () => {
        calls += 1;
        if (calls === 1) throw new Error("Execution reverted for an unknown reason.");
        return { joinedBlock: 200n, readyBlock: 200n };
      },
    });
    expect(await h.service.seat(12n)).toEqual({ kind: "seated", player: BABA.address });
    expect(h.released).toEqual([]);
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
    expect(h.waits).toEqual([1_000, 1_000]);
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
