import { describe, expect, it } from "vitest";
import { LIFT_BACK, liftedCupPosition } from "./lifted-cup";
import { seatLayout } from "./seat-layout";

describe("liftedCupPosition", () => {
  it.each(seatLayout(4, 0).map((seat) => [seat.side, seat] as const))(
    "moves the %s seat's lifted cup straight back from the middle",
    (_, seat) => {
      const [x, , z] = liftedCupPosition(seat);
      const [cx, , cz] = seat.cup;
      expect(Math.hypot(x, z)).toBeCloseTo(Math.hypot(cx, cz) + LIFT_BACK);
      expect(Math.atan2(z, x)).toBeCloseTo(Math.atan2(cz, cx));
    }
  );
});
