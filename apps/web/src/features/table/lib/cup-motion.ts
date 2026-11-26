export interface CupMotion {
  shaking: boolean;
  lifted: boolean;
}

export function cupMotion({
  index,
  ownSeat,
  throwKind,
  revealed,
  othersShaking,
  calm = false,
}: {
  index: number;
  ownSeat: number | null;
  throwKind: "idle" | "shaking" | "rolling";
  revealed: boolean;
  othersShaking: boolean;
  calm?: boolean;
}): CupMotion {
  const mine = index === ownSeat;
  if (revealed) return { shaking: false, lifted: true };
  if (mine) return { shaking: !calm && throwKind === "shaking", lifted: throwKind === "rolling" };
  return { shaking: !calm && othersShaking, lifted: false };
}

interface Spot {
  x: number;
  z: number;
}

interface Place extends Spot {
  y: number;
}

const LIFT_HEIGHT = 1.4;
const STILL = 1e-4;

export function cupStep({
  at,
  rest,
  lift,
  shaking,
  lifted,
  calm = false,
  time,
  delta,
}: CupMotion & {
  at: Place;
  rest: Spot;
  lift: Spot;
  calm?: boolean;
  time: number;
  delta: number;
}): { at: Place; tiltX: number; tiltZ: number; moving: boolean } {
  if (calm) {
    const place = lifted ? lift : rest;
    return {
      at: { x: place.x, y: lifted ? LIFT_HEIGHT : 0, z: place.z },
      tiltX: 0,
      tiltZ: 0,
      moving: false,
    };
  }
  const ease = Math.min(1, delta * 10);
  const goal = lifted ? lift : rest;
  const goalY = lifted ? LIFT_HEIGHT : shaking ? 0.08 + Math.abs(Math.sin(time * 19)) * 0.12 : 0;
  const next = {
    x: at.x + (goal.x - at.x) * ease,
    y: at.y + (goalY - at.y) * ease,
    z: at.z + (goal.z - at.z) * ease,
  };
  const settled =
    Math.abs(goal.x - next.x) < STILL &&
    Math.abs(goalY - next.y) < STILL &&
    Math.abs(goal.z - next.z) < STILL;
  return {
    at: next,
    tiltX: shaking ? Math.cos(time * 31) * 0.12 : 0,
    tiltZ: shaking ? Math.sin(time * 38) * 0.18 : 0,
    moving: shaking || !settled,
  };
}
