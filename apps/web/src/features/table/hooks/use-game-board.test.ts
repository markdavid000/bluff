import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Face } from "@/lib/dice-physics";
import { seatLayout } from "../lib/seat-layout";
import { OTHERS_SHAKE_MS, SHAKE_MS, useGameBoard } from "./use-game-board";

const play = vi.fn();
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play, stop: vi.fn() }) }));

const MINE = seatLayout(2, 0)[0];

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useGameBoard", () => {
  it("shakes the cup at a new round until the dice are known, then throws them", () => {
    let faces: Face[] | null = null;
    const { result, rerender } = renderHook(() =>
      useGameBoard({ round: 1, faces, placement: MINE })
    );
    expect(result.current.throwState.kind).toBe("shaking");
    expect(play).toHaveBeenCalledWith("shake");
    faces = [5, 1, 3, 2];
    rerender();
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS);
    });
    expect(result.current.throwState.kind).toBe("rolling");
    if (result.current.throwState.kind !== "rolling") throw new Error("Expected a throw.");
    expect(result.current.throwState.result.dice).toHaveLength(4);
    expect(play).toHaveBeenCalledWith("roll");
  });

  it("throws each round once, and again at the next round", () => {
    let round = 1;
    const faces: Face[] = [5, 1];
    const { result, rerender } = renderHook(() => useGameBoard({ round, faces, placement: MINE }));
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS);
    });
    const first = result.current.throwState;
    rerender();
    expect(result.current.throwState).toBe(first);
    round = 2;
    rerender();
    expect(result.current.throwState.kind).toBe("shaking");
  });

  it("stays still when the player has no dice to throw", () => {
    const { result } = renderHook(() => useGameBoard({ round: 1, faces: null, placement: null }));
    expect(result.current.throwState.kind).toBe("idle");
    expect(play).not.toHaveBeenCalled();
  });

  it("throws on time even while the screen keeps redrawing", () => {
    const { result, rerender } = renderHook(() =>
      useGameBoard({ round: 1, faces: [5, 1], placement: MINE })
    );
    for (let tick = 0; tick < 5; tick++) {
      act(() => {
        vi.advanceTimersByTime(SHAKE_MS / 5);
      });
      rerender();
    }
    act(() => {
      vi.advanceTimersByTime(1);
    });
    expect(result.current.throwState.kind).toBe("rolling");
  });

  it("shakes everyone else's cup briefly at the start of each round", () => {
    let round = 1;
    const { result, rerender } = renderHook(() =>
      useGameBoard({ round, faces: null, placement: MINE })
    );
    expect(result.current.othersShaking).toBe(true);
    act(() => {
      vi.advanceTimersByTime(OTHERS_SHAKE_MS);
    });
    expect(result.current.othersShaking).toBe(false);
    round = 2;
    rerender();
    expect(result.current.othersShaking).toBe(true);
  });
});
