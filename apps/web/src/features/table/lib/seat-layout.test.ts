import { describe, expect, it } from "vitest";
import { seatLayout } from "./seat-layout";

describe("seatLayout", () => {
  it("always puts you at the bottom", () => {
    for (const players of [2, 3, 4] as const) {
      for (let you = 0; you < players; you++) {
        expect(seatLayout(players, you)[you].side).toBe("bottom");
      }
    }
  });

  it("sits two players facing each other", () => {
    expect(seatLayout(2, 0).map((seat) => seat.side)).toEqual(["bottom", "top"]);
  });

  it("gives three players the bottom, left and right sides", () => {
    expect(new Set(seatLayout(3, 1).map((seat) => seat.side))).toEqual(
      new Set(["bottom", "left", "right"])
    );
  });

  it("uses every side for four players, in turn order around the board", () => {
    expect(seatLayout(4, 2).map((seat) => seat.side)).toEqual(["top", "right", "bottom", "left"]);
  });

  it("keeps each seat's colour whichever seat is yours", () => {
    expect(seatLayout(4, 3).map((seat) => seat.color)).toEqual(["red", "green", "yellow", "blue"]);
  });
});
