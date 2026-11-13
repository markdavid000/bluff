import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetBlocks, newestBlock, onBlock, seeBlock } from "./block-clock";

afterEach(() => {
  forgetBlocks();
});

describe("block clock", () => {
  it("knows no block until one is seen", () => {
    expect(newestBlock()).toBe(0n);
  });

  it("moves forward to the newest block seen", () => {
    seeBlock(10n);
    seeBlock(12n);
    expect(newestBlock()).toBe(12n);
  });

  it("never moves back to an older block", () => {
    seeBlock(12n);
    seeBlock(9n);
    expect(newestBlock()).toBe(12n);
  });

  it("tells subscribers only when it moves forward", () => {
    const heard = vi.fn();
    const stop = onBlock(heard);
    seeBlock(5n);
    seeBlock(5n);
    seeBlock(4n);
    seeBlock(6n);
    expect(heard).toHaveBeenCalledTimes(2);
    stop();
    seeBlock(7n);
    expect(heard).toHaveBeenCalledTimes(2);
  });
});
