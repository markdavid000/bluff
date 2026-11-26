import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { usePageVisible } from "./use-page-visible";

let state: DocumentVisibilityState = "visible";

function setVisibility(next: DocumentVisibilityState) {
  state = next;
  document.dispatchEvent(new Event("visibilitychange"));
}

vi.spyOn(document, "visibilityState", "get").mockImplementation(() => state);

afterEach(() => {
  state = "visible";
});

describe("usePageVisible", () => {
  it("follows the tab as it is hidden and shown again", () => {
    const { result } = renderHook(() => usePageVisible());
    expect(result.current).toBe(true);
    act(() => setVisibility("hidden"));
    expect(result.current).toBe(false);
    act(() => setVisibility("visible"));
    expect(result.current).toBe(true);
  });

  it("stops listening once nothing needs it", () => {
    const remove = vi.spyOn(document, "removeEventListener");
    const { unmount } = renderHook(() => usePageVisible());
    unmount();
    expect(remove).toHaveBeenCalledWith("visibilitychange", expect.any(Function));
  });
});
