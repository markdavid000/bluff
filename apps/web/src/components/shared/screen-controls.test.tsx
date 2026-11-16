import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsStore } from "@/lib/settings-store";
import { sharedCopy } from "./copy";
import { ScreenControls } from "./screen-controls";

vi.mock("@/hooks/use-prefers-dark", () => ({ usePrefersDark: () => false }));
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

afterEach(() => {
  act(() => settingsStore().update({ calmMotion: false, board: "auto" }));
});

function openSettings() {
  render(<ScreenControls />);
  fireEvent.keyDown(screen.getByRole("button", { name: sharedCopy.settings }), { key: "Enter" });
}

describe("ScreenControls", () => {
  it("lets the player choose the 3D or the flat board in the settings", async () => {
    openSettings();
    fireEvent.click(
      await screen.findByRole("menuitemradio", { name: sharedCopy.boardChoices["3d"] })
    );
    expect(settingsStore().get().board).toBe("3d");
  });

  it("shows which board is chosen", async () => {
    act(() => settingsStore().update({ board: "flat" }));
    openSettings();
    expect(
      await screen.findByRole("menuitemradio", { name: sharedCopy.boardChoices.flat })
    ).toHaveAttribute("aria-checked", "true");
  });

  it("lets the player calm the motion in the settings", async () => {
    openSettings();
    fireEvent.click(await screen.findByRole("menuitemcheckbox", { name: sharedCopy.calmMotion }));
    expect(settingsStore().get().calmMotion).toBe(true);
  });
});
