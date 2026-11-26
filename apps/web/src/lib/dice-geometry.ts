import type { Face } from "@bluff/game";

export type Vector = readonly [number, number, number];

export type Rotation = readonly [number, number, number, number];

export interface DieFrame {
  position: Vector;
  rotation: Rotation;
}

interface ThrownDie {
  frames: DieFrame[];
  landedFace: Face;
  faceTurn: Rotation;
}

export interface Throw {
  dice: ThrownDie[];
  settledAfterSeconds: number;
}

export const DIE_SIZE = 0.6;
export const STEP_SECONDS = 1 / 60;

export const FACE_NORMALS: Record<Face, Vector> = {
  1: [0, 1, 0],
  6: [0, -1, 0],
  2: [1, 0, 0],
  5: [-1, 0, 0],
  3: [0, 0, 1],
  4: [0, 0, -1],
};

export const BOX_FACE_ORDER: readonly Face[] = [2, 5, 1, 6, 3, 4];

const HALF_TURN = Math.PI;

export function turnBetween(from: Face, to: Face): Rotation {
  const [ax, ay, az] = FACE_NORMALS[from];
  const [bx, by, bz] = FACE_NORMALS[to];
  const dot = ax * bx + ay * by + az * bz;
  if (dot < -0.999) {
    const [kx, ky, kz] = Math.abs(ax) < 0.9 ? [1, 0, 0] : [0, 1, 0];
    const s = Math.sin(HALF_TURN * 0.5);
    return [kx * s, ky * s, kz * s, Math.cos(HALF_TURN * 0.5)];
  }
  const x = ay * bz - az * by;
  const y = az * bx - ax * bz;
  const z = ax * by - ay * bx;
  const w =
    Math.sqrt(
      Math.sqrt(ax * ax + ay * ay + az * az) ** 2 * Math.sqrt(bx * bx + by * by + bz * bz) ** 2
    ) + dot;
  const length = Math.sqrt(x * x + y * y + z * z + w * w);
  if (length === 0) return [0, 0, 0, 0];
  const scale = 1 / length;
  return [x * scale, y * scale, z * scale, w * scale];
}

export function faceUpRotation(face: Face): Rotation {
  return turnBetween(face, 1);
}
