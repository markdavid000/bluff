import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { settingsStore } from "@/lib/settings-store";
import { sharedCopy } from "./copy";
import { ScreenControls } from "./screen-controls";

vi.mock("@/hooks/use-prefers-dark", () => ({ usePrefersDark: () => false }));
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

afterEach(() => {
  act(() => settingsStore().update({ calmMotion: false, board: "3d" }));
});

function openSettings() {
  render(<ScreenControls />);
  fireEvent.keyDown(screen.getByRole("button", { name: sharedCopy.settings }), { key: "Enter" });
}

describe("ScreenControls", () => {
  it("shows the settings button in full colour, since it opens a menu rather than switching off", () => {
    render(<ScreenControls />);
    expect(screen.getByRole("button", { name: sharedCopy.settings })).not.toHaveClass("grayscale");
  });

  it("starts on the 3D board and lets the player switch to the flat one", async () => {
    openSettings();
    expect(
      await screen.findByRole("menuitemradio", { name: sharedCopy.boardChoices["3d"] })
    ).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: sharedCopy.boardChoices.flat }));
    expect(settingsStore().get().board).toBe("flat");
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

  it("keeps the game tips out of the settings, since the header has its own tips button", async () => {
    openSettings();
    await screen.findByRole("menuitemcheckbox", { name: sharedCopy.calmMotion });
    expect(screen.queryByRole("menuitem", { name: sharedCopy.gameTips })).not.toBeInTheDocument();
  });
});
