import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings-store";
import { TIPS, useTipsDialog } from "./use-tips-dialog";

let settings: Settings = DEFAULT_SETTINGS;
const update = vi.fn((change: Partial<Settings>) => {
  settings = { ...settings, ...change };
});
vi.mock("@/hooks/use-settings", () => ({ useSettings: () => ({ settings, update }) }));

beforeEach(() => {
  settings = DEFAULT_SETTINGS;
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useTipsDialog", () => {
  it("opens on the first tip for a player who hasn't seen them", () => {
    const { result } = renderHook(() => useTipsDialog());
    expect(result.current).toMatchObject({ open: true, step: 0, last: false });
    expect(result.current.tip).toBe(TIPS[0]);
  });

  it("steps through the tips, then remembers them all when the player is done", () => {
    const { result, rerender } = renderHook(() => useTipsDialog());
    for (let step = 1; step < TIPS.length; step += 1) act(() => result.current.next());
    expect(result.current).toMatchObject({ step: TIPS.length - 1, last: true });
    act(() => result.current.done());
    rerender();
    expect(update).toHaveBeenCalledWith({ seenTips: [...TIPS] });
    expect(result.current.open).toBe(false);
  });

  it("counts closing early as seen", () => {
    const { result } = renderHook(() => useTipsDialog());
    act(() => result.current.done());
    expect(update).toHaveBeenCalledWith({ seenTips: [...TIPS] });
  });

  it("stays closed once every tip was seen", () => {
    settings = { ...DEFAULT_SETTINGS, seenTips: [...TIPS] };
    expect(renderHook(() => useTipsDialog()).result.current.open).toBe(false);
  });

  it("shows them again to a player who only saw some of them as old pop-up hints", () => {
    settings = { ...DEFAULT_SETTINGS, seenTips: ["wild-ones", "how-to-raise", "call-bluff"] };
    expect(renderHook(() => useTipsDialog()).result.current.open).toBe(true);
  });
});
