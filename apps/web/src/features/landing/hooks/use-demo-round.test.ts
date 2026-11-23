import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEMO_STEPS, STEP_MS, useDemoRound } from "./use-demo-round";

let calm = false;
vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => calm }));

beforeEach(() => {
  calm = false;
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
});

describe("useDemoRound", () => {
  it("plays the round step by step, then starts again", () => {
    const { result } = renderHook(() => useDemoRound());
    const seen = [result.current];
    for (const step of DEMO_STEPS) {
      act(() => vi.advanceTimersByTime(STEP_MS[step]));
      seen.push(result.current);
    }
    expect(seen).toEqual([...DEMO_STEPS, DEMO_STEPS[0]]);
  });

  it("holds still on the reveal when motion should be calm", () => {
    calm = true;
    const { result } = renderHook(() => useDemoRound());
    expect(result.current).toBe("reveal");
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current).toBe("reveal");
  });
});
