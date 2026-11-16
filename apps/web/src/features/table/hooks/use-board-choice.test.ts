import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { resetSlowBoard, useBoardChoice } from "./use-board-choice";

let calm = false;
let webgl = true;
vi.mock("@/hooks/use-calm-motion", () => ({ useCalmMotion: () => calm }));
vi.mock("../lib/webgl", () => ({ supportsWebGL: () => webgl }));

beforeEach(() => {
  calm = false;
  webgl = true;
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
});
