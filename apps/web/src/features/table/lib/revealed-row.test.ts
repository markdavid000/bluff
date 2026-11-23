import { describe, expect, it } from "vitest";
import { ROW_TOWARD_CENTRE, revealedRowCentre } from "./revealed-row";
import { seatLayout } from "./seat-layout";

function distanceFromMiddle([x, , z]: readonly number[]): number {
  return Math.hypot(x ?? 0, z ?? 0);
}

describe("revealedRowCentre", () => {
  it.each(seatLayout(4, 0).map((seat) => [seat.side, seat] as const))(
    "lays the %s seat's revealed dice inside the board, between its cup and the middle",
    (_, seat) => {
      const row = revealedRowCentre(seat);
      expect(distanceFromMiddle(row)).toBeCloseTo(distanceFromMiddle(seat.cup) - ROW_TOWARD_CENTRE);
    }
  );
});
