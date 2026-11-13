import { decodeAbiParameters } from "viem";
import { describe, expect, it } from "vitest";
import { ONE_CHIP } from "./chips";
import { joinRequestData } from "./join-request";

const REQUEST = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "uint8" },
  { type: "uint64" },
  { type: "bool" },
] as const;

describe("joinRequestData", () => {
  it("encodes creating a paid table the way the cashier reads it", () => {
    const data = joinRequestData({
      kind: "create",
      seatCount: 2,
      buyIn: 10n * ONE_CHIP,
      isPrivate: true,
    });
    expect(decodeAbiParameters(REQUEST, data)).toEqual([0, 0n, 2, 10n * ONE_CHIP, true]);
  });

  it("encodes joining a paid table by its number", () => {
    const data = joinRequestData({ kind: "join", tableId: 12n });
    expect(decodeAbiParameters(REQUEST, data)).toEqual([1, 12n, 0, 0n, false]);
  });
});
