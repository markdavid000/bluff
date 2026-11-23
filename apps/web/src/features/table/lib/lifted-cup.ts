import type { Vector } from "@/lib/dice-physics";
import type { SeatPlacement } from "./seat-layout";

export const LIFT_BACK = 0.9;

export function liftedCupPosition(seat: Pick<SeatPlacement, "cup">): Vector {
  const [x, , z] = seat.cup;
  const reach = Math.hypot(x, z);
  const scale = reach === 0 ? 1 : (reach + LIFT_BACK) / reach;
  return [x * scale, 0, z * scale];
}
