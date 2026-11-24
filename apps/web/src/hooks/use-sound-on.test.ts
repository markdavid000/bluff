import { renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useSoundOn } from "./use-sound-on";

const play = vi.fn();
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play, stop: vi.fn() }) }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useSoundOn", () => {
  it("plays once for each new moment, and stays quiet between them", () => {
    let moment: number | null = null;
    const { rerender } = renderHook(() => useSoundOn("tick", moment));
    expect(play).not.toHaveBeenCalled();
    moment = 10;
    rerender();
    rerender();
    expect(play).toHaveBeenCalledOnce();
    expect(play).toHaveBeenCalledWith("tick");
    moment = 9;
    rerender();
    expect(play).toHaveBeenCalledTimes(2);
    moment = null;
    rerender();
    expect(play).toHaveBeenCalledTimes(2);
  });
});
