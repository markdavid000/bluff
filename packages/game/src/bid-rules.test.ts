import { describe, expect, it } from "vitest";
import type { Face } from "./face";
import {
  type Bid,
  countMatching,
  isHigher,
  isMaximal,
  isValidFace,
  isValidQuantity,
  legalBids,
  quickPicks,
} from "./bid-rules";

function bid(quantity: number, face: Bid["face"]): Bid {
  return { quantity, face };
}

describe("bid rules, matching BidRules.sol", () => {
  it("allows bids on faces 2 to 6 only", () => {
    for (const face of [0, 1, 7]) expect(isValidFace(face)).toBe(false);
    for (const face of [2, 3, 4, 5, 6]) expect(isValidFace(face)).toBe(true);
  });

  it("allows quantities from 1 to the dice in play", () => {
    expect(isValidQuantity(0, 8)).toBe(false);
    expect(isValidQuantity(1, 8)).toBe(true);
    expect(isValidQuantity(8, 8)).toBe(true);
    expect(isValidQuantity(9, 8)).toBe(false);
  });

  it("accepts any first bid", () => {
    expect(isHigher(bid(1, 2), null)).toBe(true);
  });

  it("needs a higher quantity, or the same quantity with a higher face", () => {
    expect(isHigher(bid(4, 2), bid(3, 5))).toBe(true);
    expect(isHigher(bid(3, 6), bid(3, 5))).toBe(true);
    expect(isHigher(bid(3, 5), bid(3, 5))).toBe(false);
    expect(isHigher(bid(3, 4), bid(3, 5))).toBe(false);
    expect(isHigher(bid(2, 6), bid(3, 5))).toBe(false);
  });

  it("recognises the highest possible bid", () => {
    expect(isMaximal(bid(8, 6), 8)).toBe(true);
    expect(isMaximal(bid(8, 5), 8)).toBe(false);
    expect(isMaximal(bid(7, 6), 8)).toBe(false);
  });

  it("counts dice showing the bid face and treats ones as wild", () => {
    const faces: Face[] = [1, 5, 5, 3, 6, 1, 2];
    expect(countMatching(faces, 5)).toBe(4);
    expect(countMatching(faces, 6)).toBe(3);
    expect(countMatching(faces, 4)).toBe(2);
    expect(countMatching([], 4)).toBe(0);
  });
});

describe("legalBids", () => {
  it.each([2, 3, 4, 5, 6, 7, 8, 9])(
    "offers every bid the contract accepts with %i dice in play, and nothing else",
    (diceInPlay) => {
      const current = bid(Math.ceil(diceInPlay / 2), 4);
      const offered = legalBids(current, diceInPlay);
      for (let quantity = 0; quantity <= diceInPlay + 1; quantity++) {
        for (let face = 0; face <= 7; face++) {
          const accepted =
            isValidFace(face) &&
            isValidQuantity(quantity, diceInPlay) &&
            isHigher(bid(quantity, face as Bid["face"]), current);
          const isOffered = offered.some((b) => b.quantity === quantity && b.face === face);
          expect(isOffered, `${quantity} × ${face}`).toBe(accepted);
        }
      }
    }
  );

  it("offers every bid for the first bid of a round", () => {
    expect(legalBids(null, 8)).toHaveLength(8 * 5);
  });

  it("offers nothing once the top bid is reached", () => {
    expect(legalBids(bid(8, 6), 8)).toEqual([]);
  });

  it("lists bids from the lowest up", () => {
    expect(legalBids(bid(2, 5), 3)).toEqual([
      bid(2, 6),
      bid(3, 2),
      bid(3, 3),
      bid(3, 4),
      bid(3, 5),
      bid(3, 6),
    ]);
  });
});

describe("quickPicks", () => {
  it("suggests the next face, one more of the lowest face, and one more of this face", () => {
    expect(quickPicks(bid(4, 5), 8, [])).toEqual([bid(4, 6), bid(5, 2), bid(5, 5)]);
  });

  it("drops a suggestion that isn't possible and never repeats one", () => {
    expect(quickPicks(bid(4, 6), 8, [])).toEqual([bid(5, 2), bid(5, 6)]);
    expect(quickPicks(bid(4, 2), 8, [])).toEqual([bid(4, 3), bid(5, 2)]);
    expect(quickPicks(bid(8, 5), 8, [])).toEqual([bid(8, 6)]);
    expect(quickPicks(bid(8, 6), 8, [])).toEqual([]);
  });

  it("suggests your strongest faces for the first bid, counting ones", () => {
    expect(quickPicks(null, 8, [1, 5, 5, 3])).toEqual([bid(3, 5), bid(2, 3), bid(1, 6)]);
  });

  it("suggests a single die of the highest faces when your dice aren't known yet", () => {
    expect(quickPicks(null, 8, [])).toEqual([bid(1, 6), bid(1, 5), bid(1, 4)]);
  });

  it("only ever suggests legal bids", () => {
    for (let diceInPlay = 2; diceInPlay <= 9; diceInPlay++) {
      for (const current of [null, ...legalBids(null, diceInPlay)]) {
        const legal = legalBids(current, diceInPlay);
        for (const pick of quickPicks(current, diceInPlay, [1, 2, 6])) {
          expect(legal).toContainEqual(pick);
        }
      }
    }
  });
});
