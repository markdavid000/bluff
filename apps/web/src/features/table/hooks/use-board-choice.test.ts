import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSlowBoard, useBoardChoice } from "./use-board-choice";

let calm = false;
let webgl = true;
let board: "auto" | "3d" | "flat" = "auto";
vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => calm }));
vi.mock("../lib/webgl", () => ({ supportsWebGL: () => webgl }));
vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ settings: { board }, update: vi.fn() }),
}));

beforeEach(() => {
  calm = false;
  webgl = true;
  board = "auto";
  resetSlowBoard();
});

describe("useBoardChoice", () => {
  it("shows the 3D board on a capable device", () => {
    expect(renderHook(() => useBoardChoice()).result.current.flat).toBe(false);
  });

  it("shows the flat board without WebGL", () => {
    webgl = false;
    expect(renderHook(() => useBoardChoice()).result.current.flat).toBe(true);
  });

  it("shows the flat board when motion should be calm", () => {
    calm = true;
    expect(renderHook(() => useBoardChoice()).result.current.flat).toBe(true);
  });

  it("switches to the flat board for the rest of the visit once the 3D board runs slowly", () => {
    const { result } = renderHook(() => useBoardChoice());
    act(() => result.current.reportSlow());
    expect(result.current.flat).toBe(true);
    expect(renderHook(() => useBoardChoice()).result.current.flat).toBe(true);
  });

  describe("the player's own choice", () => {
    it("keeps the 3D board when the player chose it, even with calm motion or a slow board", () => {
      board = "3d";
      calm = true;
      const { result } = renderHook(() => useBoardChoice());
      act(() => result.current.reportSlow());
      expect(result.current.flat).toBe(false);
    });

    it("still uses the flat board when the device can't draw 3D at all", () => {
      board = "3d";
      webgl = false;
      expect(renderHook(() => useBoardChoice()).result.current.flat).toBe(true);
    });

    it("uses the flat board whenever the player chose it", () => {
      board = "flat";
      expect(renderHook(() => useBoardChoice()).result.current.flat).toBe(true);
    });
  });
});
