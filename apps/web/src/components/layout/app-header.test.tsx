import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { sharedCopy } from "@/components/shared/copy";
import { AppHeader } from "./app-header";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/features/account", () => ({
  PlayerBadge: () => <button type="button">Profile</button>,
}));
vi.mock("@/features/chips", () => ({ ChipBalance: () => <button type="button">Chips</button> }));

describe("AppHeader", () => {
  it("shows only the chips, the tips and the profile, leaving the screen settings to the profile", () => {
    render(<AppHeader />);
    expect(screen.getByRole("button", { name: "Chips" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: sharedCopy.gameTips })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Profile" })).toBeInTheDocument();
    expect(
      screen.queryByRole("group", { name: sharedCopy.screenControls })
    ).not.toBeInTheDocument();
  });
});
