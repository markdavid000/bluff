import { describe, expect, it } from "vitest";
import { GAS_FLOOR, gasLimit } from "./gas";

describe("gasLimit", () => {
  it("leaves room for the table changing before the move lands", () => {
    const leaveWhenAlone = 134_153n;
    const leaveWithSomeoneBack = 407_616n;
    expect(gasLimit(leaveWhenAlone)).toBeGreaterThanOrEqual(leaveWithSomeoneBack);
  });

  it("adds half again to a large estimate", () => {
    expect(gasLimit(1_000_000n)).toBe(1_500_000n);
  });

  it("never goes below the floor, even for a move sent before it can be estimated", () => {
    expect(gasLimit(undefined)).toBe(GAS_FLOOR);
    expect(gasLimit(1n)).toBe(GAS_FLOOR);
  });
});
