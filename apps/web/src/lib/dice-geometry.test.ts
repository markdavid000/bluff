import { Quaternion, Vec3 } from "cannon-es";
import { describe, expect, it } from "vitest";
import type { Face } from "@bluff/game";
import { FACE_NORMALS, faceUpRotation, turnBetween } from "./dice-geometry";

const FACES: readonly Face[] = [1, 2, 3, 4, 5, 6];

function physicsTurn(from: Face, to: Face): readonly number[] {
  const a = new Vec3(...FACE_NORMALS[from]);
  const b = new Vec3(...FACE_NORMALS[to]);
  const turn = new Quaternion();
  if (a.dot(b) < -0.999) {
    const axis = Math.abs(a.x) < 0.9 ? new Vec3(1, 0, 0) : new Vec3(0, 1, 0);
    turn.setFromAxisAngle(axis, Math.PI);
  } else {
    turn.setFromVectors(a, b);
  }
  return [turn.x, turn.y, turn.z, turn.w];
}

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

describe("turnBetween", () => {
  it("turns every face to every other exactly as the physics library does", () => {
    for (const from of FACES) {
      for (const to of FACES) {
        expect(turnBetween(from, to)).toEqual(physicsTurn(from, to));
      }
    }
  });
});

describe("faceUpRotation", () => {
  it.each(FACES)("turns face %i to the top", (face) => {
    const up = rotate(faceUpRotation(face), FACE_NORMALS[face]);
    expect(up[1]).toBeCloseTo(1, 5);
  });
});
