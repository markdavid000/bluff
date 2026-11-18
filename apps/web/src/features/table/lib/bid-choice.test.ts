import { describe, expect, it } from "vitest";
import type { Bid } from "@bluff/game";
import { faceAvailable, fewer, lowestFor, more, startingChoice, withFace } from "./bid-choice";

const bid = (quantity: number, face: Bid["face"]): Bid => ({ quantity, face });
const CURRENT = bid(4, 5);

describe("bid choice", () => {
  it("starts on the lowest higher bid, or the player's strongest face for the first bid", () => {
    expect(startingChoice(CURRENT, 8, [])).toEqual(bid(4, 6));
    expect(startingChoice(null, 8, [1, 3, 3, 5])).toEqual(bid(3, 3));
    expect(startingChoice(bid(8, 6), 8, [])).toBeNull();
  });

  it("knows the lowest quantity each face can still be bid at", () => {
    expect(lowestFor(6, CURRENT)).toBe(4);
    expect(lowestFor(5, CURRENT)).toBe(5);
    expect(lowestFor(2, CURRENT)).toBe(5);
    expect(lowestFor(2, null)).toBe(1);
  });

  it("keeps the quantity when picking a face, raising it only when it has to", () => {
    expect(withFace(bid(6, 3), 5, CURRENT, 8)).toEqual(bid(6, 5));
    expect(withFace(bid(4, 6), 3, CURRENT, 8)).toEqual(bid(5, 3));
  });

  it("disables a face that can no longer be bid", () => {
    expect(faceAvailable(5, bid(8, 5), 8)).toBe(false);
    expect(faceAvailable(6, bid(8, 5), 8)).toBe(true);
  });

  it("steps the quantity within what's allowed", () => {
    expect(more(bid(5, 3), 8)).toEqual(bid(6, 3));
    expect(more(bid(8, 3), 8)).toBeNull();
    expect(fewer(bid(6, 3), CURRENT)).toEqual(bid(5, 3));
    expect(fewer(bid(5, 3), CURRENT)).toBeNull();
    expect(fewer(bid(1, 3), null)).toBeNull();
  });
});
