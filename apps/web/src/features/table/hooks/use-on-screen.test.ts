import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useOnScreen } from "./use-on-screen";

type Report = (entries: { isIntersecting: boolean }[]) => void;

let report: Report = () => undefined;
const observed: Element[] = [];
const disconnect = vi.fn();

beforeEach(() => {
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: Report) {
        report = callback;
      }
      observe(node: Element) {
        observed.push(node);
      }
      disconnect() {
        disconnect();
      }
    }
  );
});

afterEach(() => {
  observed.length = 0;
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

describe("useOnScreen", () => {
  it("is neither seen nor on screen before the element appears", () => {
    const { result } = renderHook(() => useOnScreen());
    expect(result.current).toMatchObject({ seen: false, onScreen: false });
  });

  it("follows the element on and off the screen, and remembers it was seen", () => {
    const { result } = renderHook(() => useOnScreen());
    const node = document.createElement("div");
    act(() => result.current.ref(node));
    expect(observed).toEqual([node]);
    act(() => report([{ isIntersecting: true }]));
    expect(result.current).toMatchObject({ seen: true, onScreen: true });
    act(() => report([{ isIntersecting: false }]));
    expect(result.current).toMatchObject({ seen: true, onScreen: false });
  });

  it("stops watching when it goes away", () => {
    const { result, unmount } = renderHook(() => useOnScreen());
    act(() => result.current.ref(document.createElement("div")));
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });
});
