import { describe, expect, it } from "vitest";
import { NEAR_ROW_TOWARD_CENTRE, ROW_TOWARD_CENTRE, revealedRowCentre } from "./revealed-row";
import { seatLayout } from "./seat-layout";

function distanceFromMiddle([x, , z]: readonly number[]): number {
  return Math.hypot(x ?? 0, z ?? 0);
}

describe("revealedRowCentre", () => {
  it.each(seatLayout(4, 0).map((seat) => [seat.side, seat] as const))(
    "lays the %s seat's revealed dice inside the board, between its cup and the middle",
    (_, seat) => {
      const row = revealedRowCentre(seat);
      const pull = seat.side === "bottom" ? NEAR_ROW_TOWARD_CENTRE : ROW_TOWARD_CENTRE;
      expect(distanceFromMiddle(row)).toBeCloseTo(distanceFromMiddle(seat.cup) - pull);
    }
  );

  it("keeps each player's revealed dice well apart from the next player's", () => {
    const rows = seatLayout(4, 0).map((seat) => revealedRowCentre(seat));
    const [bottom, left, top, right] = rows;
    if (!bottom || !left || !top || !right) throw new Error("Expected four rows.");
    const gap = (a: readonly number[], b: readonly number[]) =>
      Math.hypot((a[0] ?? 0) - (b[0] ?? 0), (a[2] ?? 0) - (b[2] ?? 0));
    for (const [a, b] of [
      [bottom, left],
      [left, top],
      [top, right],
      [right, bottom],
    ] as const) {
      expect(gap(a, b)).toBeGreaterThanOrEqual(2);
    }
  });

  it("keeps your own revealed dice clear of your lifted cup, which sits between them and you", () => {
    const [bottom] = seatLayout(4, 0);
    if (!bottom) throw new Error("Expected your seat.");
    expect(bottom.cup[2] - (revealedRowCentre(bottom)[2] ?? 0)).toBeGreaterThanOrEqual(1.25);
  });
});
