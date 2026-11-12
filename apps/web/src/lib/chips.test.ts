import { describe, expect, it } from "vitest";
import { ONE_CHIP, formatChips, parseChips } from "./chips";

describe("formatChips", () => {
  it.each([
    [0n, "0"],
    [100n * ONE_CHIP, "100"],
    [1_234_567n * ONE_CHIP, "1,234,567"],
    [ONE_CHIP / 2n, "0.5"],
    [12n * ONE_CHIP + 50_000n, "12.05"],
    [ONE_CHIP + 9_999n, "1"],
    [2n ** 64n - 1n, "18,446,744,073,709.55"],
  ])("shows %s base units as %s", (amount, shown) => {
    expect(formatChips(amount)).toBe(shown);
  });
});

describe("parseChips", () => {
  it.each([
    ["100", 100n * ONE_CHIP],
    [" 7 ", 7n * ONE_CHIP],
    ["0.5", ONE_CHIP / 2n],
    ["1.000001", ONE_CHIP + 1n],
  ])("reads %s", (input, amount) => {
    expect(parseChips(input)).toBe(amount);
  });

  it.each(["", "0", "0.0", "-1", "1.0000001", "1e3", "abc", "1,000", ".5", "1."])(
    "rejects %s",
    (input) => {
      expect(parseChips(input)).toBeNull();
    }
  );
});
