import { Body, Box, Material, ContactMaterial, Plane, Quaternion, Vec3, World } from "cannon-es";
import { between, type Random } from "./random";
import type { Face } from "@bluff/game";

export type Vector = readonly [number, number, number];

export type Rotation = readonly [number, number, number, number];

interface DieFrame {
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

export interface ThrowOptions {
  faces: readonly Face[];
  from: Vector;
  random: Random;
}

export const DIE_SIZE = 0.6;
const BOARD_HALF = 3.2;
export const STEP_SECONDS = 1 / 60;
const PHYSICS_SECONDS = 1.7;
const SETTLE_STEPS = 12;

const FACE_NORMALS: Record<Face, Vector> = {
  1: [0, 1, 0],
  6: [0, -1, 0],
  2: [1, 0, 0],
  5: [-1, 0, 0],
  3: [0, 0, 1],
  4: [0, 0, -1],
};

export const BOX_FACE_ORDER: readonly Face[] = [2, 5, 1, 6, 3, 4];

const FACES: readonly Face[] = [1, 2, 3, 4, 5, 6];

function buildWorld() {
  const world = new World({ gravity: new Vec3(0, -30, 0) });
  const surface = new Material("surface");
  const dieMaterial = new Material("die");
  world.addContactMaterial(
    new ContactMaterial(surface, dieMaterial, { friction: 0.4, restitution: 0.25 })
  );
  world.addContactMaterial(
    new ContactMaterial(dieMaterial, dieMaterial, { friction: 0.2, restitution: 0.3 })
  );
  const floor = new Body({ mass: 0, material: surface, shape: new Plane() });
  floor.quaternion.setFromEuler(-Math.PI / 2, 0, 0);
  world.addBody(floor);
  const walls: [Vec3, Vec3][] = [
    [new Vec3(BOARD_HALF, 0, 0), new Vec3(0, -Math.PI / 2, 0)],
    [new Vec3(-BOARD_HALF, 0, 0), new Vec3(0, Math.PI / 2, 0)],
    [new Vec3(0, 0, BOARD_HALF), new Vec3(0, Math.PI, 0)],
    [new Vec3(0, 0, -BOARD_HALF), new Vec3(0, 0, 0)],
  ];
  for (const [position, euler] of walls) {
    const wall = new Body({ mass: 0, material: surface, shape: new Plane() });
    wall.position.copy(position);
    wall.quaternion.setFromEuler(euler.x, euler.y, euler.z);
    world.addBody(wall);
  }
  return { world, dieMaterial };
}

const RESTING_STEPS = 6;

const STUCK_STEPS = 12;

function isStill(body: Body): boolean {
  return body.velocity.length() < 0.08 && body.angularVelocity.length() < 0.15;
}

function isFlat(body: Body): boolean {
  const [x, y, z] = FACE_NORMALS[upFace(body.quaternion)];
  return body.quaternion.vmult(new Vec3(x, y, z)).y > 0.98;
}

function flatRotation(rotation: Quaternion): Quaternion {
  const [x, y, z] = FACE_NORMALS[upFace(rotation)];
  const worldNormal = rotation.vmult(new Vec3(x, y, z));
  const correction = new Quaternion();
  correction.setFromVectors(worldNormal, new Vec3(0, 1, 0));
  return correction.mult(rotation);
}

function restingHeight(body: Body, bodies: Body[]): number {
  const onAnother = bodies.some(
    (other) =>
      other !== body &&
      Math.hypot(other.position.x - body.position.x, other.position.z - body.position.z) <
        DIE_SIZE * 0.9 &&
      other.position.y < body.position.y
  );
  return onAnother ? DIE_SIZE * 1.5 : DIE_SIZE / 2;
}

function nudge(body: Body, random: Random) {
  const towardCentre = new Vec3(-body.position.x, 0, -body.position.z);
  towardCentre.normalize();
  body.velocity.set(towardCentre.x * 1.5, between(random, 3, 4), towardCentre.z * 1.5);
  body.angularVelocity.set(between(random, -8, 8), between(random, -8, 8), between(random, -8, 8));
}

function upFace(rotation: Quaternion): Face {
  let best: Face = 1;
  let bestHeight = -Infinity;
  for (const face of FACES) {
    const [x, y, z] = FACE_NORMALS[face];
    const height = rotation.vmult(new Vec3(x, y, z)).y;
    if (height > bestHeight) {
      bestHeight = height;
      best = face;
    }
  }
  return best;
}

function turnBetween(from: Face, to: Face): Rotation {
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

export function faceUpRotation(face: Face): Rotation {
  return turnBetween(face, 1);
}

export function throwDice({ faces, from, random }: ThrowOptions): Throw {
  const { world, dieMaterial } = buildWorld();
  const half = DIE_SIZE / 2;
  const bodies = faces.map((_, index) => {
    const body = new Body({
      mass: 1,
      material: dieMaterial,
      shape: new Box(new Vec3(half, half, half)),
      linearDamping: 0.3,
      angularDamping: 0.3,
    });
    const spread = (index - (faces.length - 1) / 2) * DIE_SIZE * 1.6;
    const toward = new Vec3(-from[0], 0, -from[2]);
    toward.normalize();
    const side = new Vec3(-toward.z, 0, toward.x);
    body.position.set(
      from[0] + side.x * spread,
      from[1] + between(random, 0, 0.4),
      from[2] + side.z * spread
    );
    body.quaternion.setFromEuler(
      between(random, 0, Math.PI * 2),
      between(random, 0, Math.PI * 2),
      between(random, 0, Math.PI * 2)
    );
    const speed = between(random, 4.5, 6);
    body.velocity.set(
      toward.x * speed + between(random, -1, 1),
      between(random, 1, 3),
      toward.z * speed + between(random, -1, 1)
    );
    body.angularVelocity.set(
      between(random, -15, 15),
      between(random, -15, 15),
      between(random, -15, 15)
    );
    world.addBody(body);
    return body;
  });

  const frames: DieFrame[][] = bodies.map(() => []);
  const maxSteps = Math.round(PHYSICS_SECONDS / STEP_SECONDS);
  let steps = 0;
  let stillFor = 0;
  const stuckFor = bodies.map(() => 0);
  while (steps < maxSteps) {
    world.step(STEP_SECONDS);
    steps += 1;
    bodies.forEach((body, index) => {
      frames[index].push({
        position: [body.position.x, body.position.y, body.position.z],
        rotation: [body.quaternion.x, body.quaternion.y, body.quaternion.z, body.quaternion.w],
      });
    });
    bodies.forEach((body, index) => {
      stuckFor[index] = isStill(body) && !isFlat(body) ? stuckFor[index] + 1 : 0;
      if (stuckFor[index] >= STUCK_STEPS) {
        nudge(body, random);
        stuckFor[index] = 0;
      }
    });
    stillFor = bodies.every((body) => isStill(body) && isFlat(body)) ? stillFor + 1 : 0;
    if (stillFor >= RESTING_STEPS) break;
  }

  const settleSteps = bodies.every((body) => isStill(body) && isFlat(body)) ? 0 : SETTLE_STEPS;
  bodies.forEach((body, index) => {
    const start = new Quaternion().copy(body.quaternion);
    const target = flatRotation(start);
    const startY = body.position.y;
    const targetY = restingHeight(body, bodies);
    for (let step = 1; step <= settleSteps; step++) {
      const t = step / settleSteps;
      const eased = 1 - (1 - t) * (1 - t);
      const rotation = new Quaternion();
      start.slerp(target, eased, rotation);
      frames[index].push({
        position: [body.position.x, startY + (targetY - startY) * eased, body.position.z],
        rotation: [rotation.x, rotation.y, rotation.z, rotation.w],
      });
    }
    if (settleSteps > 0) body.quaternion.copy(target);
  });

  return {
    settledAfterSeconds: (steps + settleSteps) * STEP_SECONDS,
    dice: bodies.map((body, index) => {
      const landedFace = upFace(body.quaternion);
      return {
        frames: frames[index],
        landedFace,
        faceTurn: turnBetween(faces[index], landedFace),
      };
    }),
  };
}

export function shownFace(rotation: Rotation, faceTurn: Rotation): Face {
  const body = new Quaternion(...rotation);
  const turn = new Quaternion(...faceTurn);
  return upFace(body.mult(turn));
}

export function flatness(rotation: Rotation, faceTurn: Rotation, face: Face): number {
  const combined = new Quaternion(...rotation).mult(new Quaternion(...faceTurn));
  const [x, y, z] = FACE_NORMALS[face];
  return combined.vmult(new Vec3(x, y, z)).y;
}
