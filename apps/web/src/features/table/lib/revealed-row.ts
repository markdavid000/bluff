import type { Vector } from "@/lib/dice-physics";
import type { SeatPlacement } from "./seat-layout";

export const ROW_TOWARD_CENTRE = 0.85;
export const NEAR_ROW_TOWARD_CENTRE = 1.3;

export function revealedRowCentre(seat: Pick<SeatPlacement, "cup" | "side">): Vector {
  const [x, , z] = seat.cup;
  const reach = Math.hypot(x, z);
  const pull = seat.side === "bottom" ? NEAR_ROW_TOWARD_CENTRE : ROW_TOWARD_CENTRE;
  const scale = reach === 0 ? 0 : (reach - pull) / reach;
  return [x * scale, 0, z * scale];
}
