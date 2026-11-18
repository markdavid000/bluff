import type { Table } from "@bluff/game";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import { describe, expect, it } from "vitest";
import { createLog } from "./log";
import { type BluffCall, type SeatChain, createSeatRunner } from "./seat-runner";

const NOW = 1_800_000_000_000;
const HOST = "0x0000000000000000000000000000000000001a2b";
const ME = "0x00000000000000000000000000000000000b0b0b";

function seat(player: string, overrides: Partial<Table["seats"][number]> = {}) {
  return {
    player: player as `0x${string}`,
    ready: true,
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
    status: "playing",
    isPrivate: false,
    seatCount: 2,
    buyIn: 0n,
    deadline: NOW + 60_000,
    ...NO_GAME,
    diceInPlay: 8,
    round: 1,
    turn: 1,
    bid: { quantity: 1, face: 2, bidder: 0 },
    seats: [seat(HOST, { dice: 4 }), seat(ME, { dice: 4 })],
    ...overrides,
  };
}

function harness({
  tables,
  tableAt,
  dice = [[5n, 5n, 5n, 0n]] as (readonly unknown[] | Error)[],
  proofs = [{ clearValues: "0x01", proof: "0x02" }] as (
    { clearValues: `0x${string}`; proof: `0x${string}` } | Error
  )[],
}: {
  tables: Table[];
  tableAt?: (block: bigint | undefined) => Table;
  dice?: (readonly unknown[] | Error)[];
  proofs?: ({ clearValues: `0x${string}`; proof: `0x${string}` } | Error)[];
}) {
  let clock = NOW;
  let block = 100n;
  const sent: BluffCall[] = [];
  const reads: (bigint | undefined)[] = [];
  const limits: number[] = [];
  const sentAt: (bigint | undefined)[] = [];
  const lines: string[] = [];
  let done = 0;
  const next = <T>(list: T[]): T => (list.length > 1 ? (list.shift() as T) : (list[0] as T));
  const chain: SeatChain = {
    readTable: async (_id, atBlock) => {
      reads.push(atBlock);
      return tableAt ? tableAt(atBlock) : next(tables);
    },
    send: async (_index, call, atBlock) => {
      sentAt.push(atBlock);
      sent.push(call);
      block += 1n;
      return { blockNumber: block };
    },
    ownDice: async (_index, _id, timeoutMs) => {
      limits.push(timeoutMs);
      const result = next(dice);
      if (result instanceof Error) throw result;
      return result;
    },
    revealProof: async (_id, timeoutMs) => {
      limits.push(timeoutMs);
      const result = next(proofs);
      if (result instanceof Error) throw result;
      return result;
    },
  };
  const runner = createSeatRunner({
    index: 1,
    address: ME,
    tableId: 12n,
    seatedAt: NOW - 30_000,
    seatedBlock: 100n,
    chain,
    log: createLog((line) => lines.push(line)),
    random: () => 0.99,
    now: () => clock,
    sleep: async (ms) => {
      clock += ms;
    },
    onDone: () => {
      done += 1;
    },
  });
  return {
    runner,
    sent,
    reads,
    lines,
    limits,
    done: () => done,
    advance: (ms: number) => (clock += ms),
    spent: () => clock - NOW,
    sentAt,
  };
}

describe("seat runner", () => {
  it("thinks, reads its own dice, and raises to the smallest bid its dice make certain", async () => {
    const h = harness({ tables: [table()] });
    await h.runner.update(101n);
    expect(h.sent).toEqual([{ functionName: "placeBid", args: [12n, 1, 3] }]);
  });

  it("moves only once for the same turn, however often the table is read", async () => {
    const h = harness({ tables: [table()] });
    await Promise.all([h.runner.update(101n), h.runner.update(101n), h.runner.update(102n)]);
    await h.runner.update(103n);
    expect(h.sent).toHaveLength(1);
  });

  it("acts at once, without thinking, when the turn is nearly over", async () => {
    const h = harness({ tables: [table({ deadline: NOW + 10_000 })] });
    await h.runner.update();
    expect(h.sent).toHaveLength(1);
  });

  it("keeps trying to read its dice while the network catches up", async () => {
    const h = harness({
      tables: [table()],
      dice: [new Error("not yet"), new Error("not yet"), [5n, 5n, 5n, 0n]],
    });
    await h.runner.update();
    expect(h.sent).toEqual([{ functionName: "placeBid", args: [12n, 1, 3] }]);
  });

  it("never waits on the network past its own turn, and says when the dice aren't ready yet", async () => {
    const h = harness({ tables: [table()], dice: [new Error("not yet"), [5n, 5n, 5n, 0n]] });
    await h.runner.update();
    expect(h.limits.length).toBe(2);
    for (const limit of h.limits) {
      expect(limit).toBeGreaterThan(0);
      expect(limit).toBeLessThanOrEqual(60_000 - 15_000);
    }
    expect(h.lines.some((line) => line.includes("dice not ready"))).toBe(true);
    expect(h.lines.some((line) => line.includes("thinking"))).toBe(true);
  });

  it("lets the turn lapse rather than move without seeing its dice", async () => {
    const h = harness({ tables: [table()], dice: [new Error("relayer down")] });
    await h.runner.update();
    expect(h.sent).toEqual([]);
    expect(h.lines.some((line) => line.includes("turn lapsed"))).toBe(true);
  });

  it("doesn't move if the turn has passed by the time it's ready", async () => {
    const h = harness({ tables: [table(), table({ turn: 0 })] });
    await h.runner.update();
    expect(h.sent).toEqual([]);
  });

  it("reads the table at its last move's block or later, never an older one", async () => {
    const h = harness({ tables: [table(), table(), table({ turn: 0 })] });
    await h.runner.update(101n);
    await h.runner.update(90n);
    expect(h.reads.at(-1)).toBe(101n);
  });

  it("reads the table no earlier than the block it joined at, so a lagging node can't hide its seat", async () => {
    const h = harness({ tables: [table()] });
    await h.runner.update();
    expect(h.reads[0]).toBe(100n);
  });

  it("re-checks the table at the newest block it has seen before moving, not an older one", async () => {
    const h = harness({ tables: [table()] });
    await h.runner.update(150n);
    expect(h.reads).toEqual([150n, 150n]);
    expect(h.sent).toHaveLength(1);
  });

  it("checks each move against the newest block it has seen, not a lagging server's latest", async () => {
    const waiting = table({
      status: "waiting",
      deadline: NOW + 9 * 60_000,
      seats: [seat(HOST), seat(ME, { ready: false })],
    });
    const h = harness({ tables: [waiting] });
    await h.runner.update(130n);
    expect(h.sentAt).toEqual([130n]);
  });

  it("gets ready in the waiting room, and leaves if the player who invited it has gone", async () => {
    const waiting = table({
      status: "waiting",
      deadline: NOW + 9 * 60_000,
      seats: [seat(HOST), seat(ME, { ready: false })],
    });
    const h = harness({ tables: [waiting] });
    await h.runner.update();
    expect(h.sent).toEqual([{ functionName: "setReady", args: [12n, true] }]);
    const alone = harness({
      tables: [table({ status: "waiting", deadline: NOW + 9 * 60_000, seats: [seat(ME)] })],
    });
    await alone.runner.update();
    expect(alone.sent).toEqual([{ functionName: "leaveTable", args: [12n] }]);
  });

  it("settles a reveal with a proof, retrying while the proof isn't ready", async () => {
    const revealing = table({
      status: "revealing",
      deadline: NOW + 9 * 60_000,
      caller: 1,
      turn: 0,
    });
    const h = harness({
      tables: [revealing],
      proofs: [new Error("not yet"), { clearValues: "0x01", proof: "0x02" }],
    });
    await h.runner.update();
    expect(h.sent).toEqual([{ functionName: "settleReveal", args: [12n, "0x01", "0x02"] }]);
  });

  it("stops waiting for a reveal as soon as someone else has settled it, so its own turn isn't held up", async () => {
    const revealing = table({
      status: "revealing",
      deadline: NOW + 9 * 60_000,
      caller: 1,
      turn: 0,
    });
    const settled = table({ round: 2, turn: 1, bid: null });
    const h = harness({
      tables: [revealing, settled],
      proofs: [new Error("revealHandles reverted")],
    });
    await h.runner.update();
    expect(h.sent).toEqual([]);
    expect(h.spent()).toBeLessThan(10_000);
    await h.runner.update();
    expect(h.sent.map((call) => call.functionName)).toEqual(["placeBid"]);
  });

  it("sees newer blocks that arrive while it's busy, so a settled reveal can't trap it", async () => {
    const revealing = table({
      status: "revealing",
      deadline: NOW + 9 * 60_000,
      caller: 1,
      turn: 0,
    });
    const settled = table({ round: 2, turn: 1, bid: null });
    const h = harness({
      tables: [],
      tableAt: (block) => (block !== undefined && block >= 160n ? settled : revealing),
      proofs: [new Error("revealHandles reverted")],
    });
    await Promise.all([h.runner.update(150n), h.runner.update(160n)]);
    expect(h.spent()).toBeLessThan(20_000);
    expect(h.sent.map((call) => call.functionName)).toEqual(["placeBid"]);
  });

  it("claims the other player's timeout when it's due", async () => {
    const h = harness({ tables: [table({ turn: 0, deadline: NOW - 60_000 })] });
    await h.runner.update();
    expect(h.sent).toEqual([{ functionName: "claimTimeout", args: [12n] }]);
  });

  it("frees its player once, when the game is over", async () => {
    const h = harness({ tables: [table({ status: "finished" })] });
    await h.runner.update();
    await h.runner.update();
    expect(h.done()).toBe(1);
    expect(h.runner.isDone()).toBe(true);
  });

  it("logs moves without ever writing its dice", async () => {
    const h = harness({ tables: [table()], dice: [[5n, 5n, 5n, 0n]] });
    await h.runner.update();
    expect(h.lines.length).toBeGreaterThan(0);
    for (const line of h.lines) {
      const fields = Object.keys(JSON.parse(line));
      expect(
        fields.every((field) =>
          [
            "time",
            "level",
            "event",
            "table",
            "player",
            "action",
            "tx",
            "block",
            "reason",
            "ms",
            "error",
            "count",
          ].includes(field)
        )
      ).toBe(true);
    }
  });

  it("logs a failed move and tries again on the next read", async () => {
    const h = harness({ tables: [table()] });
    let failures = 1;
    const original = h.sent.push.bind(h.sent);
    h.sent.push = (...calls: BluffCall[]) => {
      if (failures-- > 0) throw new Error("nonce too low");
      return original(...calls);
    };
    await h.runner.update();
    const failed = h.lines
      .map((line) => JSON.parse(line))
      .find((entry) => entry.event === "move failed");
    expect(failed).toMatchObject({ action: "placeBid" });
    await h.runner.update();
    expect(h.sent).toHaveLength(1);
  });
});
