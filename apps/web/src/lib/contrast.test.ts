import { describe, expect, it } from "vitest";
import { contrastRatio } from "./contrast";

describe("contrastRatio", () => {
  it("measures black on white at 21 to 1, and a colour on itself at 1 to 1", () => {
    expect(contrastRatio("oklch(1 0 0)", "oklch(0 0 0)")).toBeCloseTo(21, 0);
    expect(contrastRatio("oklch(0.5 0.1 150)", "oklch(0.5 0.1 150)")).toBeCloseTo(1);
  });

  it("refuses a colour it can't read", () => {
    expect(() => contrastRatio("#fff", "oklch(0 0 0)")).toThrow("Not an oklch colour");
  });
});
