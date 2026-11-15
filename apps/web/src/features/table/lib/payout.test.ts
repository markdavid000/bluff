import { describe, expect, it } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { potOf, shareOf } from "./payout";

const A = "0x0000000000000000000000000000000000001a2b";
const B = "0x0000000000000000000000000000000000003c4d";
const C = "0x0000000000000000000000000000000000005e6f";

describe("payout, as the cashier pays it", () => {
  it("puts every seat's buy-in in the pot, including players who are out", () => {
    expect(potOf(10n * ONE_CHIP, 3)).toBe(30n * ONE_CHIP);
    expect(potOf(0n, 3)).toBe(0n);
  });

  it("gives a lone winner the whole pot", () => {
    expect(shareOf(30n, [A], A)).toBe(30n);
  });

  it("splits a shared win evenly, the first winner also taking the remainder", () => {
    expect(shareOf(31n, [A, B, C], A)).toBe(11n);
    expect(shareOf(31n, [A, B, C], B)).toBe(10n);
    expect(shareOf(31n, [A, B, C], C)).toBe(10n);
  });

  it("gives nothing to a player who didn't win", () => {
    expect(shareOf(30n, [A], B)).toBeNull();
    expect(shareOf(30n, [], A)).toBeNull();
  });

  it("matches winners whatever the letter case", () => {
    expect(shareOf(30n, [A.toUpperCase().replace("0X", "0x")], A)).toBe(30n);
  });
});
