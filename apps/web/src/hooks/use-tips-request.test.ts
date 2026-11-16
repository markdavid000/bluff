import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { hideTips, showTips, useTipsRequested } from "./use-tips-request";

describe("useTipsRequested", () => {
  it("opens the tips when asked from anywhere, and closes them again", () => {
    const { result } = renderHook(() => useTipsRequested());
    expect(result.current).toBe(false);
    act(() => showTips());
    expect(result.current).toBe(true);
    act(() => hideTips());
    expect(result.current).toBe(false);
  });
});
