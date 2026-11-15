import { describe, expect, it } from "vitest";
import { cupMotion } from "./cup-motion";

const idle = { kind: "idle" } as const;
const shaking = { kind: "shaking", startedAt: 0 } as const;

describe("cupMotion", () => {
  it("shakes the player's own cup, wherever they sit at the table", () => {
    expect(
      cupMotion({
        index: 1,
        ownSeat: 1,
        throwKind: shaking.kind,
        revealed: false,
        othersShaking: false,
      })
    ).toEqual({
      shaking: true,
      lifted: false,
    });
    expect(
      cupMotion({
        index: 0,
        ownSeat: 1,
        throwKind: shaking.kind,
        revealed: false,
        othersShaking: false,
      })
    ).toEqual({
      shaking: false,
      lifted: false,
    });
  });

  it("lifts the player's own cup while their dice roll out", () => {
    expect(
      cupMotion({
        index: 1,
        ownSeat: 1,
        throwKind: "rolling",
        revealed: false,
        othersShaking: false,
      }).lifted
    ).toBe(true);
  });

  it("shakes everyone else's cup at the start of a round", () => {
    expect(
      cupMotion({
        index: 0,
        ownSeat: 1,
        throwKind: idle.kind,
        revealed: false,
        othersShaking: true,
      }).shaking
    ).toBe(true);
    expect(
      cupMotion({
        index: 1,
        ownSeat: 1,
        throwKind: idle.kind,
        revealed: false,
        othersShaking: true,
      }).shaking
    ).toBe(false);
  });

  it("lifts every cup when the dice are revealed", () => {
    expect(
      cupMotion({
        index: 0,
        ownSeat: 1,
        throwKind: idle.kind,
        revealed: true,
        othersShaking: false,
      })
    ).toEqual({
      shaking: false,
      lifted: true,
    });
  });
});
