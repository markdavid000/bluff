import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetGraphicsCheck } from "@/hooks/use-board-setting";
import type * as Graphics from "@/lib/graphics";
import { settingsStore } from "@/lib/settings-store";
import { sharedCopy } from "./copy";
import { ScreenControls } from "./screen-controls";

vi.mock("@/hooks/use-prefers-dark", () => ({ usePrefersDark: () => false }));
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

let support: Graphics.GraphicsSupport = "full";
const probe = vi.fn(() => support);
vi.mock("@/lib/graphics", async (importOriginal) => ({
  ...(await importOriginal<typeof Graphics>()),
  graphicsSupport: () => probe(),
}));

afterEach(() => {
  act(() =>
    settingsStore().update({
      calmMotion: false,
      board: "3d",
      boardPicked: false,
      theme: "auto",
      sounds: true,
    })
  );
  support = "full";
  probe.mockClear();
  forgetGraphicsCheck();
});

function openSettings() {
  render(<ScreenControls />);
  fireEvent.keyDown(screen.getByRole("button", { name: sharedCopy.settings }), { key: "Enter" });
}

describe("ScreenControls", () => {
  it("opens its menus with a visible grow and fade, and closes them the same way", async () => {
    openSettings();
    const menu = (await screen.findByRole("menu")).closest("[data-slot=dropdown-menu-content]");
    expect(menu).toHaveClass(
      "duration-200",
      "data-[state=open]:zoom-in-90",
      "data-[state=closed]:zoom-out-90"
    );
  });

  it("keeps the night switch's name fixed and says whether it is on", () => {
    render(<ScreenControls />);
    const night = screen.getByRole("button", { name: sharedCopy.nightMode });
    expect(night).toHaveAttribute("aria-pressed", "false");
    fireEvent.click(night);
    expect(screen.getByRole("button", { name: sharedCopy.nightMode })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("keeps the sounds switch's name fixed and says whether it is on", () => {
    render(<ScreenControls />);
    const sounds = screen.getByRole("button", { name: sharedCopy.soundEffects });
    expect(sounds).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(sounds);
    expect(screen.getByRole("button", { name: sharedCopy.soundEffects })).toHaveAttribute(
      "aria-pressed",
      "false"
    );
  });

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

  it("shows the flat board on a slow device, and keeps 3D once the player picks it", async () => {
    support = "weak";
    openSettings();
    expect(
      await screen.findByRole("menuitemradio", { name: sharedCopy.boardChoices.flat })
    ).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("menuitemradio", { name: sharedCopy.boardChoices["3d"] }));
    expect(settingsStore().get()).toMatchObject({ board: "3d", boardPicked: true });
  });

  it("checks the device's graphics only once the settings are opened", async () => {
    render(<ScreenControls />);
    expect(probe).not.toHaveBeenCalled();
    fireEvent.keyDown(screen.getByRole("button", { name: sharedCopy.settings }), { key: "Enter" });
    await screen.findByRole("menuitemradio", { name: sharedCopy.boardChoices["3d"] });
    expect(probe).toHaveBeenCalled();
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
