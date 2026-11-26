import { describe, expect, it } from "vitest";
import { type CupMotion, cupMotion, cupStep } from "./cup-motion";

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

describe("cupStep", () => {
  const rest = { x: 2, z: 2 };
  const lift = { x: 2.6, z: 2.6 };
  const still = { x: 2, y: 0, z: 2 };

  function run(from: { x: number; y: number; z: number }, motion: CupMotion, frames: number) {
    let at = from;
    let last = cupStep({ at, rest, lift, ...motion, time: 0, delta: 1 / 60 });
    for (let frame = 0; frame < frames; frame++) {
      last = cupStep({ at, rest, lift, ...motion, time: frame / 60, delta: 1 / 60 });
      at = last.at;
    }
    return last;
  }

  it("stays still once a resting cup is where it belongs", () => {
    const step = cupStep({
      at: still,
      rest,
      lift,
      shaking: false,
      lifted: false,
      time: 3,
      delta: 1 / 60,
    });
    expect(step).toEqual({ at: still, tiltX: 0, tiltZ: 0, moving: false });
  });

  it("keeps moving for as long as the cup shakes", () => {
    expect(run(still, { shaking: true, lifted: false }, 600).moving).toBe(true);
  });

  it("lifts the cup back and up, then stops asking to be drawn", () => {
    const rising = run(still, { shaking: false, lifted: true }, 10);
    expect(rising.moving).toBe(true);
    const lifted = run(still, { shaking: false, lifted: true }, 200);
    expect(lifted.moving).toBe(false);
    expect(lifted.at.x).toBeCloseTo(lift.x, 3);
    expect(lifted.at.y).toBeCloseTo(1.4, 3);
  });

  it("eases the same way as before, a tenth of the way per sixtieth of a second", () => {
    const step = cupStep({
      at: still,
      rest,
      lift,
      shaking: false,
      lifted: true,
      time: 0,
      delta: 1 / 60,
    });
    expect(step.at.y).toBeCloseTo(1.4 / 6, 10);
  });
});
