import type { Table } from "@bluff/game";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import type { Address } from "viem";
import { describe, expect, it } from "vitest";
import { MoveRefused, MoveReverted, TableMissing } from "./chain-errors";
import { createLog } from "./log";
import type { Acquired, PlayerPool } from "./player-pool";
import { MOST_SEATING, type Seated, type ServiceChain, createSeatService } from "./seat-service";

const NOW = 1_800_000_000_000;
const HOST = "0x0000000000000000000000000000000000001a2b" as Address;
const STRANGER = "0x0000000000000000000000000000000000009f9f" as Address;
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
  seatOf = async () => 0n,
  balance = async () => 10n ** 17n,
}: {
  read?: () => Promise<Table>;
  acquired?: Acquired;
  join?: () => Promise<Seated>;
  seatOf?: () => Promise<bigint>;
  balance?: () => Promise<bigint>;
} = {}) {
  let clock = NOW;
  let head = 150n;
  let balanceReads = 0;
  const sent: { index: number; tableId: bigint; atBlock: bigint }[] = [];
  const readAt: (bigint | undefined)[] = [];
  const waits: number[] = [];
  const released: number[] = [];
  const started: { index: number; tableId: bigint; seatedAt: number; seatedBlock: bigint }[] = [];
  let waited = 0;
  const chain: ServiceChain = {
    blockNumber: async () => head,
    readTable: async (id, atBlock) => {
      readAt.push(atBlock);
      return read ? read() : quickTable();
    },
    joinAndReady: async (index, tableId, atBlock) => {
      sent.push({ index, tableId, atBlock });
      return join ? join() : { joinedBlock: 200n, readyBlock: 200n };
    },
    balanceOf: async () => {
      balanceReads += 1;
      return balance();
    },
    tableOf: async () => seatOf(),
  };
  const spares: number[] = [];
  const pool = {
    acquire: async () => acquired,
    ensureSpare: async () => void spares.push(1),
    release: (index: number) => void released.push(index),
    known: () => [{ ...BABA, busy: true }],
    owns: (address: string) => address.toLowerCase() === BABA.address.toLowerCase(),
  } as unknown as PlayerPool;
  const service = createSeatService({
    bank: "0x00000000000000000000000000000000000000b0",
    chain,
    pool,
    startRunner: (player, tableId, seatedAt, seatedBlock) =>
      void started.push({ index: player.index, tableId, seatedAt, seatedBlock }),
    now: () => clock,
    sleep: async (ms) => {
      waited += ms;
      waits.push(ms);
      clock += ms;
    },
    log: createLog(() => undefined),
  });
  return {
    service,
    sent,
    released,
    started,
    readAt,
    waits,
    spares,
    waited: () => waited,
    pass: (ms: number) => {
      clock += ms;
    },
    newBlock: (block: bigint) => {
      head = block;
    },
    balanceReads: () => balanceReads,
  };
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
    expect(h.waits).toEqual([3_000, 3_000]);
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

  it("frees the player and passes on any other failure to join, once the chain shows it never sat down", async () => {
    const h = harness({ join: async () => Promise.reject(new Error("rpc down")) });
    await expect(h.service.seat(12n)).rejects.toThrow("rpc down");
    expect(h.released).toEqual([1]);
    expect(h.started).toEqual([]);
  });

  describe("when a join's outcome is unclear", () => {
    it("keeps playing a table the computer did join, though the confirmation failed", async () => {
      const h = harness({
        join: async () => Promise.reject(new Error("receipt timed out")),
        seatOf: async () => 12n,
      });
      expect(await h.service.seat(12n)).toEqual({ kind: "seated", player: BABA.address });
      expect(h.released).toEqual([]);
      expect(h.started).toMatchObject([{ index: 1, tableId: 12n }]);
    });

    it("never frees a computer the chain shows is still seated somewhere else, and says it is busy", async () => {
      const h = harness({
        join: async () => Promise.reject(new MoveRefused("AlreadyAtTable", null)),
        seatOf: async () => 99n,
      });
      expect(await h.service.seat(12n)).toEqual({ kind: "refused", reason: "all-busy" });
      expect(h.released).toEqual([]);
      expect(h.started).toMatchObject([{ index: 1, tableId: 99n }]);
    });

    it("says the table is full when its join was beaten on-chain, instead of failing", async () => {
      let reads = 0;
      const h = harness({
        join: async () => Promise.reject(new MoveReverted("0xdead")),
        read: async () =>
          ++reads === 1
            ? quickTable()
            : quickTable({
                seats: [
                  { player: HOST, ready: false, isHost: true, isActive: true, ...NO_DICE },
                  { player: STRANGER, ready: false, isHost: false, isActive: true, ...NO_DICE },
                ],
              }),
      });
      expect(await h.service.seat(12n)).toEqual({ kind: "refused", reason: "full" });
      expect(h.released).toEqual([1]);
      expect(h.sent).toHaveLength(1);
    });

    it("gives up on a stumbling join after 15 seconds of real time, however slow each try is", async () => {
      const h = harness({
        join: async () => {
          h.pass(12_000);
          throw new Error("rpc down");
        },
      });
      await expect(h.service.seat(12n)).rejects.toThrow("rpc down");
      expect(h.sent.length).toBeLessThanOrEqual(2);
    });

    it("checks each retry at the newest block, not the one the table was first read at", async () => {
      let calls = 0;
      const h = harness({
        join: async () => {
          calls += 1;
          if (calls === 1) {
            h.newBlock(160n);
            throw new Error("rpc down");
          }
          return { joinedBlock: 200n, readyBlock: 200n };
        },
      });
      await h.service.seat(12n);
      expect(h.sent.map((attempt) => attempt.atBlock)).toEqual([150n, 160n]);
    });
  });

  describe("when the same table is asked for again", () => {
    it("says the computer is seated, not 'taken', when one of ours already sits there", async () => {
      const h = harness({
        read: async () =>
          quickTable({
            seats: [
              { player: HOST, ready: false, isHost: true, isActive: true, ...NO_DICE },
              { player: BABA.address, ready: true, isHost: false, isActive: true, ...NO_DICE },
            ],
          }),
      });
      expect(await h.service.seat(12n)).toEqual({ kind: "seated", player: BABA.address });
      expect(h.sent).toEqual([]);
    });

    it("shares one attempt between two requests for the same table at once", async () => {
      const h = harness();
      const [first, second] = await Promise.all([h.service.seat(12n), h.service.seat(12n)]);
      expect(first).toEqual(second);
      expect(h.sent).toHaveLength(1);
    });
  });

  it("turns new tables away while too many are already being seated", async () => {
    let release: () => void = () => undefined;
    const held = new Promise<void>((resolve) => (release = resolve));
    const h = harness({
      join: async () => {
        await held;
        return { joinedBlock: 200n, readyBlock: 200n };
      },
    });
    const seating = Array.from({ length: MOST_SEATING }, (_, i) => h.service.seat(BigInt(20 + i)));
    expect(await h.service.seat(99n)).toEqual({ kind: "refused", reason: "all-busy" });
    release();
    await Promise.all(seating);
    expect(await h.service.seat(98n)).toMatchObject({ kind: "seated" });
  });

  it("serves health from a short cache, and keeps its last answer when the network stumbles", async () => {
    let failing = false;
    const h = harness({
      balance: async () => (failing ? Promise.reject(new Error("rpc down")) : 10n ** 17n),
    });
    const first = await h.service.health();
    await h.service.health();
    expect(h.balanceReads()).toBe(2);
    h.pass(31_000);
    failing = true;
    expect(await h.service.health()).toEqual(first);
  });

  it("reports the bank and each player's balance for the health check", async () => {
    const h = harness();
    expect(await h.service.health()).toEqual({
      bank: { address: "0x00000000000000000000000000000000000000b0", balance: "0.1" },
      players: [{ address: BABA.address, name: "Baba Dice", busy: true, balance: "0.1" }],
    });
  });
});
