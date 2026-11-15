import { describe, expect, it } from "vitest";
import { bidChance, bidRisk } from "./bid-odds";

describe("bidChance", () => {
  it("is certain when the player's own dice already make the bid", () => {
    expect(bidChance({ quantity: 2, face: 5 }, [5, 1, 3], 6)).toBe(1);
  });

  it("is impossible when there aren't enough hidden dice left", () => {
    expect(bidChance({ quantity: 9, face: 5 }, [5], 3)).toBe(0);
  });

  it("works out the chance from the hidden dice, a third of which match on average", () => {
    expect(bidChance({ quantity: 4, face: 5 }, [], 4)).toBeCloseTo(1 / 81, 6);
    expect(bidChance({ quantity: 2, face: 5 }, [], 6)).toBeCloseTo(0.6488, 3);
    expect(bidChance({ quantity: 3, face: 5 }, [], 6)).toBeCloseTo(0.3196, 3);
  });

  it("counts the player's ones as every face", () => {
    expect(bidChance({ quantity: 3, face: 4 }, [1, 4, 1], 5)).toBe(1);
  });
});

describe("bidRisk", () => {
  it.each([
    [1, "safe"],
    [0.6, "safe"],
    [0.59, "risky"],
    [0.3, "risky"],
    [0.29, "very-risky"],
    [0, "very-risky"],
  ] as const)("calls a %f chance %s", (chance, risk) => {
    expect(bidRisk(chance)).toBe(risk);
  });
});
