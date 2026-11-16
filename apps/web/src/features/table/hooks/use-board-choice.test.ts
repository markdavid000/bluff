import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetBoardCheck, useBoardChoice } from "./use-board-choice";

let webgl = true;
let board: "3d" | "flat" = "3d";
vi.mock("../lib/webgl", () => ({ supportsWebGL: () => webgl }));
vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ settings: { board, calmMotion: true }, update: vi.fn() }),
}));

beforeEach(() => {
  webgl = true;
  board = "3d";
  forgetBoardCheck();
});

describe("useBoardChoice", () => {
  it("shows the 3D board by default, even with calm motion on", () => {
    expect(renderHook(() => useBoardChoice()).result.current).toBe(false);
  });

  it("shows the flat board when the player chooses it", () => {
    board = "flat";
    expect(renderHook(() => useBoardChoice()).result.current).toBe(true);
  });

  it("shows the flat board when the device can't draw 3D", () => {
    webgl = false;
    expect(renderHook(() => useBoardChoice()).result.current).toBe(true);
  });
});
