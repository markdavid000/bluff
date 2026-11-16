import { act, renderHook } from "@testing-library/react";
import type * as Motion from "motion/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsStore } from "@/lib/settings-store";
import { useCalmMotion, useCalmClass } from "./use-calm-motion";

let deviceReduced = false;
vi.mock("motion/react", async (importOriginal) => ({
  ...(await importOriginal<typeof Motion>()),
  useReducedMotion: () => deviceReduced,
}));

afterEach(() => {
  deviceReduced = false;
  act(() => settingsStore().update({ calmMotion: false }));
  document.documentElement.classList.remove("calm");
});

describe("calm motion", () => {
  it("is calm when the device asks for less motion", () => {
    deviceReduced = true;
    expect(renderHook(() => useCalmMotion()).result.current).toBe(true);
  });

  it("is calm when the player turns on calm motion", () => {
    act(() => settingsStore().update({ calmMotion: true }));
    expect(renderHook(() => useCalmMotion()).result.current).toBe(true);
  });

  it("moves normally otherwise", () => {
    expect(renderHook(() => useCalmMotion()).result.current).toBe(false);
  });

  it("marks the page so styles calm down with the setting", () => {
    renderHook(() => useCalmClass());
    expect(document.documentElement).not.toHaveClass("calm");
    act(() => settingsStore().update({ calmMotion: true }));
    expect(document.documentElement).toHaveClass("calm");
  });
});
