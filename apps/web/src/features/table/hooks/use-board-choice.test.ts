import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { forgetGraphicsCheck } from "@/hooks/use-board-setting";
import type * as Graphics from "@/lib/graphics";
import { useBoardChoice } from "./use-board-choice";

let support: Graphics.GraphicsSupport = "full";
let board: "3d" | "flat" = "3d";
let boardPicked = false;
vi.mock("@/lib/graphics", async (importOriginal) => ({
  ...(await importOriginal<typeof Graphics>()),
  graphicsSupport: () => support,
}));
vi.mock("@/hooks/use-settings", () => ({
  useSettings: () => ({ settings: { board, boardPicked, calmMotion: true }, update: vi.fn() }),
}));

beforeEach(() => {
  support = "full";
  board = "3d";
  boardPicked = false;
  forgetGraphicsCheck();
});

describe("useBoardChoice", () => {
  it("shows the 3D board by default, even with calm motion on", () => {
    expect(renderHook(() => useBoardChoice()).result.current).toBe(false);
  });

  it("shows the flat board when the player chooses it", () => {
    board = "flat";
    boardPicked = true;
    expect(renderHook(() => useBoardChoice()).result.current).toBe(true);
  });

  it("shows the flat board when the device can't draw 3D", () => {
    support = "none";
    expect(renderHook(() => useBoardChoice()).result.current).toBe(true);
  });

  it("shows the flat board on a device that would draw 3D slowly", () => {
    support = "weak";
    expect(renderHook(() => useBoardChoice()).result.current).toBe(true);
  });

  it("keeps the 3D board on a slow device when the player picked it", () => {
    support = "weak";
    boardPicked = true;
    expect(renderHook(() => useBoardChoice()).result.current).toBe(false);
  });
});
