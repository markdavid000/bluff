import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useThemeColors } from "./use-theme-colors";

let palette = "red";

vi.mock("@/lib/css-color", () => ({
  resolveTokenColor: (token: string) => `${palette}-${token}`,
}));

const changeClass = async (className: string) => {
  await act(async () => {
    document.documentElement.className = className;
    await Promise.resolve();
  });
};

afterEach(() => {
  document.documentElement.className = "";
  palette = "red";
});

describe("useThemeColors", () => {
  it("keeps the same colours when the page's classes change but the colours don't", async () => {
    const { result } = renderHook(() => useThemeColors());
    const first = result.current;
    await changeClass("something-else");
    expect(result.current).toBe(first);
  });

  it("gives new colours when the theme really changes", async () => {
    const { result } = renderHook(() => useThemeColors());
    const first = result.current;
    palette = "blue";
    await changeClass("dark");
    expect(result.current).not.toBe(first);
    expect(result.current?.["--board"]).toBe("blue---board");
  });
});
