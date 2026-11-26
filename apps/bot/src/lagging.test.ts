import { ResourceNotFoundRpcError, RpcRequestError } from "viem";
import { describe, expect, it } from "vitest";
import { checkBlock, untilCaughtUp } from "./lagging";

function notFound() {
  return new ResourceNotFoundRpcError(
    new RpcRequestError({
      body: {},
      url: "",
      error: { code: -32001, message: "Requested resource not found" },
    })
  );
}

describe("checkBlock", () => {
  it("checks a move at the newest block either side has seen", () => {
    expect(checkBlock(100n, 120n)).toBe(120n);
    expect(checkBlock(130n, 120n)).toBe(130n);
    expect(checkBlock(undefined, 120n)).toBe(120n);
  });
});

describe("untilCaughtUp", () => {
  it("asks again when a lagging node hasn't seen the block yet", async () => {
    let calls = 0;
    const waits: number[] = [];
    const result = await untilCaughtUp(
      async () => {
        calls += 1;
        if (calls < 3) throw notFound();
        return "table";
      },
      async (ms) => void waits.push(ms)
    );
    expect(result).toBe("table");
    expect(waits).toEqual([1_000, 1_000]);
  });

  it("gives up after a few tries and passes the error on", async () => {
    let calls = 0;
    const failing = untilCaughtUp(
      async () => {
        calls += 1;
        throw notFound();
      },
      async () => undefined
    );
    await expect(failing).rejects.toBeInstanceOf(ResourceNotFoundRpcError);
    expect(calls).toBe(3);
  });

  it("passes any other error straight on", async () => {
    let calls = 0;
    const failing = untilCaughtUp(
      async () => {
        calls += 1;
        throw new Error("reverted");
      },
      async () => undefined
    );
    await expect(failing).rejects.toThrow("reverted");
    expect(calls).toBe(1);
  });
});
