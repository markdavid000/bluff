import { type Bid, type Face, isHigher, isValidFace, isValidQuantity } from "@bluff/game";
import { describe, expect, it } from "vitest";
import { STRATEGY, chooseMove } from "./strategy";

const NEVER_BLUFF = () => 0.99;
const ALWAYS_BLUFF = () => 0;

function seeded(seed: number) {
  let state = seed;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function bid(quantity: number, face: Bid["face"]): Bid {
  return { quantity, face };
}

describe("chooseMove", () => {
  it("opens with the biggest bid that's still more likely true than not", () => {
    expect(chooseMove({ bid: null, diceInPlay: 8, ownFaces: [6, 6, 1, 3] }, NEVER_BLUFF)).toEqual({
      kind: "bid",
      bid: bid(4, 6),
    });
  });

  it("calls a bid that can't be true", () => {
    expect(chooseMove({ bid: bid(4, 6), diceInPlay: 4, ownFaces: [2, 3] }, NEVER_BLUFF)).toEqual({
      kind: "call",
    });
  });

  it("calls a bid that's unlikely to be true", () => {
    expect(chooseMove({ bid: bid(3, 6), diceInPlay: 6, ownFaces: [2, 3] }, NEVER_BLUFF)).toEqual({
      kind: "call",
    });
  });

  it("never calls a bid its own dice already make true, even when bluffing", () => {
    for (const random of [NEVER_BLUFF, ALWAYS_BLUFF]) {
      expect(chooseMove({ bid: bid(3, 5), diceInPlay: 6, ownFaces: [5, 5, 1] }, random).kind).toBe(
        "bid"
      );
    }
  });

  it("raises to the bid most likely to be true", () => {
    expect(
      chooseMove({ bid: bid(3, 4), diceInPlay: 8, ownFaces: [4, 4, 1, 2] }, NEVER_BLUFF)
    ).toEqual({ kind: "bid", bid: bid(4, 4) });
  });

  it("sometimes bluffs, with the lowest raise on a face it holds none of", () => {
    expect(
      chooseMove({ bid: bid(2, 4), diceInPlay: 8, ownFaces: [4, 4, 2, 2] }, ALWAYS_BLUFF)
    ).toEqual({ kind: "bid", bid: bid(2, 5) });
  });

  it("can't bluff on a face it holds none of when a wild one matches every face", () => {
    expect(
      chooseMove({ bid: bid(3, 4), diceInPlay: 8, ownFaces: [4, 4, 1, 2] }, ALWAYS_BLUFF)
    ).toEqual({ kind: "bid", bid: bid(4, 4) });
  });

  it("has to call the highest possible bid, since no raise exists", () => {
    expect(
      chooseMove({ bid: bid(4, 6), diceInPlay: 4, ownFaces: [6, 6, 6, 6] }, NEVER_BLUFF)
    ).toEqual({ kind: "call" });
  });

  it("never makes an illegal bid", () => {
    const random = seeded(7);
    for (let game = 0; game < 2000; game++) {
      const diceInPlay = 2 + Math.floor(random() * 7);
      const own = 1 + Math.floor(random() * Math.min(4, diceInPlay - 1));
      const ownFaces = Array.from({ length: own }, () => (1 + Math.floor(random() * 6)) as Face);
      const current =
        random() < 0.2
          ? null
          : bid(
              1 + Math.floor(random() * diceInPlay),
              (2 + Math.floor(random() * 5)) as Bid["face"]
            );
      const move = chooseMove({ bid: current, diceInPlay, ownFaces }, random);
      if (move.kind === "bid") {
        expect(isValidFace(move.bid.face)).toBe(true);
        expect(isValidQuantity(move.bid.quantity, diceInPlay)).toBe(true);
        expect(isHigher(move.bid, current)).toBe(true);
      } else {
        expect(current).not.toBeNull();
      }
    }
  });

  it("bluffs on about 15 % of the raises where a bluff is possible", () => {
    const random = seeded(42);
    const turns = 10_000;
    let bluffs = 0;
    for (let turn = 0; turn < turns; turn++) {
      const move = chooseMove({ bid: bid(2, 4), diceInPlay: 8, ownFaces: [4, 4, 2, 2] }, random);
      if (move.kind === "bid" && move.bid.face === 5 && move.bid.quantity === 2) bluffs++;
    }
    expect(bluffs / turns).toBeGreaterThan(STRATEGY.bluffShare - 0.02);
    expect(bluffs / turns).toBeLessThan(STRATEGY.bluffShare + 0.02);
  });

  it("keeps its settings in one place", () => {
    expect(STRATEGY).toEqual({ callBelow: 0.35, openFrom: 0.5, bluffShare: 0.15 });
  });
});
