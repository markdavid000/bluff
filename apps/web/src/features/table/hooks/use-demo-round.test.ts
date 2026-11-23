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
    const seen = [result.current.step];
    for (const step of DEMO_STEPS) {
      act(() => vi.advanceTimersByTime(STEP_MS[step]));
      seen.push(result.current.step);
    }
    expect(seen).toEqual([...DEMO_STEPS, DEMO_STEPS[0]]);
  });

  it("counts a new round each time it starts again, so the dice are thrown afresh", () => {
    const { result } = renderHook(() => useDemoRound());
    expect(result.current.round).toBe(1);
    for (const step of DEMO_STEPS) act(() => vi.advanceTimersByTime(STEP_MS[step]));
    expect(result.current).toEqual({ step: DEMO_STEPS[0], round: 2 });
  });

  it("holds still on the reveal when motion should be calm", () => {
    calm = true;
    const { result } = renderHook(() => useDemoRound());
    expect(result.current.step).toBe("reveal");
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.step).toBe("reveal");
  });
});
