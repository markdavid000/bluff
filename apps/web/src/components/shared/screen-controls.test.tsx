import { act, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsStore } from "@/lib/settings-store";
import { sharedCopy } from "./copy";
import { ScreenControls } from "./screen-controls";

vi.mock("@/hooks/use-prefers-dark", () => ({ usePrefersDark: () => false }));

afterEach(() => {
  act(() => settingsStore().update({ calmMotion: false }));
});

describe("ScreenControls", () => {
  it("can be switched from the screen controls", () => {
    render(<ScreenControls />);
    act(() => screen.getByRole("button", { name: sharedCopy.calmOn }).click());
    expect(settingsStore().get().calmMotion).toBe(true);
    act(() => screen.getByRole("button", { name: sharedCopy.calmOff }).click());
    expect(settingsStore().get().calmMotion).toBe(false);
  });
});
