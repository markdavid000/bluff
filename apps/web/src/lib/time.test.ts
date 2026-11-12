import { describe, expect, it } from "vitest";
import { formatCountdown } from "./time";

const SECOND = 1000;
const MINUTE = 60 * SECOND;
const HOUR = 60 * MINUTE;

describe("formatCountdown", () => {
  it.each([
    [0, "00:00:00"],
    [-5 * SECOND, "00:00:00"],
    [1, "00:00:01"],
    [SECOND, "00:00:01"],
    [59 * SECOND + 1, "00:01:00"],
    [3 * HOUR + 12 * MINUTE + 45 * SECOND, "03:12:45"],
    [23 * HOUR + 59 * MINUTE + 59 * SECOND, "23:59:59"],
    [24 * HOUR, "24:00:00"],
  ])("shows %i ms as %s", (milliseconds, shown) => {
    expect(formatCountdown(milliseconds)).toBe(shown);
  });
});
