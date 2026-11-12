import { renderHook, waitFor } from "@testing-library/react";
import type * as Motion from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { useCountingAmount } from "./use-counting-amount";

let calm = false;
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => calm,
}));

afterEach(() => {
  calm = false;
});

function countFrom(start: bigint) {
  return renderHook(({ target }) => useCountingAmount(target), { initialProps: { target: start } });
}

describe("useCountingAmount", () => {
  it("shows the first amount straight away", () => {
    const { result } = countFrom(100n * ONE_CHIP);
    expect(result.current).toEqual({ shown: 100n * ONE_CHIP, direction: null });
  });

  it("counts down through the amounts in between after a cash out, and lands exactly", async () => {
    const { result, rerender } = countFrom(100n * ONE_CHIP);
    const seen: bigint[] = [];
    rerender({ target: 75n * ONE_CHIP });
    expect(result.current.direction).toBe("down");
    await waitFor(
      () => {
        seen.push(result.current.shown);
        expect(result.current.shown).toBe(75n * ONE_CHIP);
      },
      { timeout: 3_000, interval: 50 }
    );
    expect(seen.some((amount) => amount < 100n * ONE_CHIP && amount > 75n * ONE_CHIP)).toBe(true);
    expect(result.current.direction).toBeNull();
  });

  it("counts up when chips arrive", async () => {
    const { result, rerender } = countFrom(75n * ONE_CHIP);
    rerender({ target: 175n * ONE_CHIP });
    expect(result.current.direction).toBe("up");
    await waitFor(() => expect(result.current.shown).toBe(175n * ONE_CHIP), { timeout: 3_000 });
  });

  it("jumps without counting when the player asks for less motion", async () => {
    calm = true;
    const { result, rerender } = countFrom(100n * ONE_CHIP);
    rerender({ target: 75n * ONE_CHIP });
    await waitFor(() => expect(result.current.shown).toBe(75n * ONE_CHIP), { timeout: 200 });
  });
});
