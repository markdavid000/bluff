import type { Vector } from "@/lib/dice-physics";
import type { SeatPlacement } from "./seat-layout";

export const ROW_TOWARD_CENTRE = 1.25;

export function revealedRowCentre(seat: Pick<SeatPlacement, "cup">): Vector {
  const [x, , z] = seat.cup;
  const reach = Math.hypot(x, z);
  const scale = reach === 0 ? 0 : (reach - ROW_TOWARD_CENTRE) / reach;
  return [x * scale, 0, z * scale];
}
