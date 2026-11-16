import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { hideTips, useTipsRequested } from "@/hooks/use-tips-request";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings-store";
import { TIPS, useTipSteps, useTipsDialog, useTipsOnFirstVisit } from "./use-tips-dialog";

let settings: Settings = DEFAULT_SETTINGS;
const update = vi.fn((change: Partial<Settings>) => {
  settings = { ...settings, ...change };
});
vi.mock("@/hooks/use-settings", () => ({ useSettings: () => ({ settings, update }) }));

beforeEach(() => {
  settings = DEFAULT_SETTINGS;
});

afterEach(() => {
  act(() => hideTips());
  vi.clearAllMocks();
});

describe("useTipsOnFirstVisit", () => {
  it("opens the tips for a player who hasn't seen them", () => {
    renderHook(() => useTipsOnFirstVisit());
    expect(renderHook(() => useTipsRequested()).result.current).toBe(true);
  });

  it("leaves them closed once every tip was seen", () => {
    settings = { ...DEFAULT_SETTINGS, seenTips: [...TIPS] };
    renderHook(() => useTipsOnFirstVisit());
    expect(renderHook(() => useTipsRequested()).result.current).toBe(false);
  });

  it("opens them again for a player who only saw some as the old pop-up hints", () => {
    settings = { ...DEFAULT_SETTINGS, seenTips: ["wild-ones", "how-to-raise", "call-bluff"] };
    renderHook(() => useTipsOnFirstVisit());
    expect(renderHook(() => useTipsRequested()).result.current).toBe(true);
  });
});

describe("useTipsDialog", () => {
  it("remembers every tip and closes when the player is done, even early", () => {
    renderHook(() => useTipsOnFirstVisit());
    const { result } = renderHook(() => useTipsDialog());
    expect(result.current.open).toBe(true);
    act(() => result.current.done());
    expect(update).toHaveBeenCalledWith({ seenTips: [...TIPS] });
    expect(result.current.open).toBe(false);
  });
});

describe("useTipSteps", () => {
  it("starts on the first tip and steps to the last", () => {
    const { result } = renderHook(() => useTipSteps());
    expect(result.current).toMatchObject({
      step: 0,
      tip: TIPS[0],
      last: false,
      total: TIPS.length,
    });
    for (let step = 1; step < TIPS.length; step += 1) act(() => result.current.next());
    expect(result.current).toMatchObject({ step: TIPS.length - 1, last: true });
  });
});
