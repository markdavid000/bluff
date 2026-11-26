import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { LONGEST_FRAME_SECONDS, useFramesWhileMoving } from "./use-frames-while-moving";

type FrameCallback = (state: { invalidate: () => void }, delta: number) => void;

let frame: FrameCallback = () => undefined;
const invalidate = vi.fn();
vi.mock("@react-three/fiber", () => ({
  useFrame: (callback: FrameCallback) => {
    frame = callback;
  },
  useThree: (pick: (state: { invalidate: () => void }) => unknown) => pick({ invalidate }),
}));

afterEach(() => {
  vi.clearAllMocks();
});

function draw(delta = 1 / 60) {
  frame({ invalidate }, delta);
}

describe("useFramesWhileMoving", () => {
  it("asks for the next frame while something moves, and stops once it is still", () => {
    let framesLeft = 3;
    renderHook(() => useFramesWhileMoving(() => (framesLeft -= 1) > 0, "start"));
    invalidate.mockClear();
    draw();
    draw();
    expect(invalidate).toHaveBeenCalledTimes(2);
    draw();
    draw();
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("asks for a frame when it first appears and whenever its motion changes", () => {
    let wake = "resting";
    const { rerender } = renderHook(() => useFramesWhileMoving(() => false, wake));
    expect(invalidate).toHaveBeenCalledOnce();
    rerender();
    expect(invalidate).toHaveBeenCalledOnce();
    wake = "lifted";
    rerender();
    expect(invalidate).toHaveBeenCalledTimes(2);
  });

  it("never lets a long pause between frames jump the motion ahead", () => {
    const seen: number[] = [];
    renderHook(() =>
      useFramesWhileMoving((_, delta) => {
        seen.push(delta);
        return false;
      }, "start")
    );
    draw(12);
    draw(1 / 60);
    expect(seen).toEqual([LONGEST_FRAME_SECONDS, 1 / 60]);
  });
});
