import { describe, expect, it } from "vitest";
import { revealedBySeat } from "./reveal";

describe("revealedBySeat", () => {
  it("hands each seat its own dice, in seat order, marking the ones that count", () => {
    expect(revealedBySeat([5, 1, 3, 4, 5, 2], [2, 0, 4], 5)).toEqual([
      { faces: [5, 1], counting: [true, true] },
      null,
      { faces: [3, 4, 5, 2], counting: [false, false, true, false] },
    ]);
  });

  it("splits nothing when the dice don't add up, instead of guessing", () => {
    expect(revealedBySeat([5, 1, 3], [2, 2], 5)).toBeNull();
  });

  it("refuses faces that aren't real dice", () => {
    expect(revealedBySeat([5, 9], [2], 5)).toBeNull();
  });
});
