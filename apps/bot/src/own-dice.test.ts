import { describe, expect, it } from "vitest";
import { facesFrom } from "./own-dice";

describe("facesFrom", () => {
  it("turns the stored values 0 to 5 into the faces 1 to 6", () => {
    expect(facesFrom([0n, 1n, 2n, 3n, 4n, 5n])).toEqual([1, 2, 3, 4, 5, 6]);
    expect(facesFrom([0, 5])).toEqual([1, 6]);
  });

  it("has no faces when the computer has no dice", () => {
    expect(facesFrom([])).toEqual([]);
  });

  it.each([[6n], [-1n], [2.5], ["3"], [undefined], [true]])(
    "refuses a value that can't be a die (%s), rather than guessing",
    (value) => {
      expect(() => facesFrom([0n, value])).toThrow(/not a die/);
    }
  );
});
