import { describe, expect, it } from "vitest";
import type { Face } from "@bluff/game";
import { faceUpRotation, flatness, shownFace, throwDice } from "./dice-physics";
import { seededRandom } from "./random";

const SIDES = [
  [0, 1.2, 2.8],
  [0, 1.2, -2.8],
  [2.8, 1.2, 0],
  [-2.8, 1.2, 0],
] as const;

function facesFor(seed: number, count: number): Face[] {
  return Array.from({ length: count }, (_, index) => (((seed + index * 5) % 6) + 1) as Face);
}

describe("throwDice", () => {
  it("lands every die on the face it was given, across 600 seeded throws", () => {
    for (let seed = 1; seed <= 150; seed++) {
      const faces = facesFor(seed, 4);
      const result = throwDice({
        faces,
        from: SIDES[seed % SIDES.length],
        random: seededRandom(seed),
      });
      result.dice.forEach((die, index) => {
        const last = die.frames[die.frames.length - 1];
        expect(shownFace(last.rotation, die.faceTurn)).toBe(faces[index]);
        expect(flatness(last.rotation, die.faceTurn, faces[index])).toBeGreaterThan(0.95);
      });
    }
  });

  it("settles within two seconds", () => {
    for (let seed = 1; seed <= 40; seed++) {
      const result = throwDice({
        faces: facesFor(seed, 4),
        from: SIDES[seed % SIDES.length],
        random: seededRandom(seed),
      });
      expect(result.settledAfterSeconds).toBeLessThanOrEqual(2);
    }
  });

  it("throws the same way for the same seed", () => {
    const first = throwDice({ faces: [3, 5], from: SIDES[0], random: seededRandom(7) });
    const second = throwDice({ faces: [3, 5], from: SIDES[0], random: seededRandom(7) });
    expect(second.dice[0].frames.at(-1)).toEqual(first.dice[0].frames.at(-1));
  });

  it("throws differently for different seeds", () => {
    const first = throwDice({ faces: [3], from: SIDES[0], random: seededRandom(1) });
    const second = throwDice({ faces: [3], from: SIDES[0], random: seededRandom(2) });
    expect(second.dice[0].frames.at(-1)).not.toEqual(first.dice[0].frames.at(-1));
  });
});

describe("faceUpRotation", () => {
  function rotate([x, y, z, w]: readonly number[], [vx, vy, vz]: readonly number[]) {
    const ix = w * vx + y * vz - z * vy;
    const iy = w * vy + z * vx - x * vz;
    const iz = w * vz + x * vy - y * vx;
    const iw = -x * vx - y * vy - z * vz;
    return [
      ix * w + iw * -x + iy * -z - iz * -y,
      iy * w + iw * -y + iz * -x - ix * -z,
      iz * w + iw * -z + ix * -y - iy * -x,
    ];
  }

  it.each([1, 2, 3, 4, 5, 6] as const)("turns face %i to the top", (face) => {
    const normals: Record<number, number[]> = {
      1: [0, 1, 0],
      6: [0, -1, 0],
      2: [1, 0, 0],
      5: [-1, 0, 0],
      3: [0, 0, 1],
      4: [0, 0, -1],
    };
    const up = rotate(faceUpRotation(face), normals[face] ?? []);
    expect(up[1]).toBeCloseTo(1, 5);
  });
});
