import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Face } from "@bluff/game";
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

  it("lets the dice land with a settle once they stop rolling", () => {
    const { result } = renderHook(() =>
      useGameBoard({ round: 1, faces: [5, 1, 3], placement: MINE })
    );
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS);
    });
    if (result.current.throwState.kind !== "rolling") throw new Error("Expected a throw.");
    const settleMs = result.current.throwState.result.settledAfterSeconds * 1000;
    act(() => {
      vi.advanceTimersByTime(settleMs - 50);
    });
    expect(play).not.toHaveBeenCalledWith("settle");
    act(() => {
      vi.advanceTimersByTime(50);
    });
    expect(play).toHaveBeenCalledWith("settle");
  });

  it("makes no sound at all when it's told to keep quiet", () => {
    renderHook(() => useGameBoard({ round: 1, faces: [5, 1], placement: MINE, quiet: true }));
    act(() => {
      vi.advanceTimersByTime(5_000);
    });
    expect(play).not.toHaveBeenCalled();
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

  it("waits for the player's dice until they leave the cup, from the first frame of each round", () => {
    let round = 1;
    const faces: Face[] = [5, 1];
    const { result, rerender } = renderHook(() => useGameBoard({ round, faces, placement: MINE }));
    expect(result.current.waitingForDice).toBe(true);
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS);
    });
    expect(result.current.waitingForDice).toBe(false);
    round = 2;
    rerender();
    expect(result.current.waitingForDice).toBe(true);
  });

  it("keeps waiting while the dice are still unknown", () => {
    const { result } = renderHook(() => useGameBoard({ round: 1, faces: null, placement: MINE }));
    act(() => {
      vi.advanceTimersByTime(SHAKE_MS * 3);
    });
    expect(result.current.waitingForDice).toBe(true);
  });

  it("never waits for a player who isn't throwing", () => {
    const { result } = renderHook(() => useGameBoard({ round: 1, faces: null, placement: null }));
    expect(result.current.waitingForDice).toBe(false);
  });

  it("stays still when the player has no dice to throw", () => {
    const { result } = renderHook(() => useGameBoard({ round: 1, faces: null, placement: null }));
    expect(result.current.throwState.kind).toBe("idle");
    expect(play).not.toHaveBeenCalled();
  });

  it("shakes and throws without a sound when asked to be quiet", () => {
    const { result } = renderHook(() =>
      useGameBoard({ round: 1, faces: [5, 3], placement: MINE ?? null, quiet: true })
    );
    expect(result.current.throwState.kind).toBe("shaking");
    act(() => vi.advanceTimersByTime(SHAKE_MS));
    expect(result.current.throwState.kind).toBe("rolling");
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
