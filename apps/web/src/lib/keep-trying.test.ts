import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { keepTrying } from "./keep-trying";

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("keepTrying", () => {
  it("answers at once when the first try works", async () => {
    const attempt = vi.fn().mockResolvedValue("done");
    await expect(keepTrying(attempt, { forMs: 30_000, everyMs: 3_000 })).resolves.toBe("done");
    expect(attempt).toHaveBeenCalledOnce();
  });

  it("waits between tries until one works", async () => {
    const attempt = vi
      .fn()
      .mockRejectedValueOnce(new Error("not yet"))
      .mockRejectedValueOnce(new Error("not yet"))
      .mockResolvedValue("done");
    const answer = keepTrying(attempt, { forMs: 30_000, everyMs: 3_000 });
    await vi.advanceTimersByTimeAsync(6_000);
    await expect(answer).resolves.toBe("done");
    expect(attempt).toHaveBeenCalledTimes(3);
  });

  it("gives up with the last problem once the time is up", async () => {
    const attempt = vi.fn().mockRejectedValue(new Error("still not"));
    const answer = keepTrying(attempt, { forMs: 9_000, everyMs: 3_000 });
    const settled = answer.then(
      () => "resolved",
      (error: Error) => error.message
    );
    await vi.advanceTimersByTimeAsync(9_000);
    await expect(settled).resolves.toBe("still not");
    expect(attempt).toHaveBeenCalledTimes(4);
  });
});
