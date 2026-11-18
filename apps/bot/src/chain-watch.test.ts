import { InvalidParamsRpcError, RpcRequestError } from "viem";
import { describe, expect, it } from "vitest";
import { LOG_SPAN, SWEEP_MS, type WatchChain, createChainWatch } from "./chain-watch";
import { createLog } from "./log";

function behind() {
  return new InvalidParamsRpcError(
    new RpcRequestError({
      body: {},
      error: { code: -32602, message: "invalid params" },
      url: "rpc",
    })
  );
}

function harness(seatedTables: bigint[]) {
  let head = 100n;
  let clock = 1_800_000_000_000;
  const spans: [bigint, bigint][] = [];
  const events = new Map<bigint, bigint[]>();
  const failures: Error[] = [];
  const seen: { ids: bigint[]; head: bigint }[] = [];
  const chain: WatchChain = {
    blockNumber: async () => head,
    touchedTables: async (from, to) => {
      spans.push([from, to]);
      const failure = failures.shift();
      if (failure) throw failure;
      const ids: bigint[] = [];
      for (let block = from; block <= to; block++) ids.push(...(events.get(block) ?? []));
      return ids;
    },
  };
  const watch = createChainWatch({
    chain,
    seated: () => seatedTables,
    onTables: (ids, at) => void seen.push({ ids, head: at }),
    now: () => clock,
    log: createLog(() => undefined),
  });
  return {
    watch,
    spans,
    seen,
    events,
    failures,
    mine: (blocks: bigint) => (head += blocks),
    wait: (ms: number) => (clock += ms),
  };
}

describe("chain watch", () => {
  it("reads every seated table on its first check", async () => {
    const h = harness([12n, 13n]);
    await h.watch.poll();
    expect(h.seen).toEqual([{ ids: [12n, 13n], head: 100n }]);
  });

  it("then reads only the tables that new events touched, at the newest block", async () => {
    const h = harness([12n, 13n]);
    await h.watch.poll();
    h.events.set(101n, [13n, 99n]);
    h.mine(1n);
    await h.watch.poll();
    expect(h.seen.at(-1)).toEqual({ ids: [13n], head: 101n });
    expect(h.spans).toEqual([[101n, 101n]]);
  });

  it("asks for nothing while no new block has arrived", async () => {
    const h = harness([12n]);
    await h.watch.poll();
    await h.watch.poll();
    expect(h.spans).toEqual([]);
    expect(h.seen).toHaveLength(1);
  });

  it("splits a long gap into spans the RPC accepts", async () => {
    const h = harness([12n]);
    await h.watch.poll();
    h.mine(25n);
    await h.watch.poll();
    expect(h.spans).toEqual([
      [101n, 100n + LOG_SPAN],
      [101n + LOG_SPAN, 100n + 2n * LOG_SPAN],
      [101n + 2n * LOG_SPAN, 125n],
    ]);
  });

  it("re-reads every seated table every 10 seconds, for timeouts no event announces", async () => {
    const h = harness([12n, 13n]);
    await h.watch.poll();
    h.mine(1n);
    h.wait(SWEEP_MS);
    await h.watch.poll();
    expect(h.seen.at(-1)).toEqual({ ids: [12n, 13n], head: 101n });
  });

  it("does nothing, and forgets where it was, while no computer is seated", async () => {
    const h = harness([]);
    await h.watch.poll();
    expect(h.seen).toEqual([]);
    expect(h.spans).toEqual([]);
  });

  it("reads every seated table when a lagging server can't search the new blocks yet, then retries them", async () => {
    const h = harness([12n, 13n]);
    await h.watch.poll();
    h.failures.push(behind());
    h.mine(1n);
    await h.watch.poll();
    expect(h.seen.at(-1)).toEqual({ ids: [12n, 13n], head: 101n });
    await h.watch.poll();
    expect(h.spans).toEqual([
      [101n, 101n],
      [101n, 101n],
    ]);
  });

  it("passes on any other failure to search", async () => {
    const h = harness([12n]);
    await h.watch.poll();
    h.failures.push(new Error("rpc down"));
    h.mine(1n);
    await expect(h.watch.poll()).rejects.toThrow("rpc down");
  });
});
