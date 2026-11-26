import { describe, expect, it } from "vitest";
import { createLog } from "./log";
import { STARTUP_WAITS_MS, untilStarted } from "./startup";

describe("untilStarted", () => {
  it("keeps trying a startup read through a network outage, waiting longer each time", async () => {
    let calls = 0;
    const waits: number[] = [];
    const lines: string[] = [];
    const result = await untilStarted(
      "resume",
      async () => {
        calls += 1;
        if (calls < 4) throw new Error("rpc down");
        return 7;
      },
      { sleep: async (ms) => void waits.push(ms), log: createLog((line) => void lines.push(line)) }
    );
    expect(result).toBe(7);
    expect(waits).toEqual(STARTUP_WAITS_MS.slice(0, 3));
    expect(lines.filter((line) => line.includes("start delayed"))).toHaveLength(3);
  });

  it("keeps its longest wait once the outage outlasts the list", async () => {
    let calls = 0;
    const waits: number[] = [];
    await untilStarted(
      "resume",
      async () => {
        calls += 1;
        if (calls <= STARTUP_WAITS_MS.length + 2) throw new Error("rpc down");
        return true;
      },
      { sleep: async (ms) => void waits.push(ms), log: createLog(() => undefined) }
    );
    expect(waits.slice(-3)).toEqual(Array(3).fill(STARTUP_WAITS_MS.at(-1)));
  });
});
