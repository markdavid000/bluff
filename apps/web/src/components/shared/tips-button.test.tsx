import { act, fireEvent, render, renderHook, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { hideTips, useTipsRequested } from "@/hooks/use-tips-request";
import { sharedCopy } from "./copy";
import { TipsButton } from "./tips-button";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

afterEach(() => act(() => hideTips()));

describe("TipsButton", () => {
  it("brings the game tips back, and says so on wide screens", () => {
    render(<TipsButton />);
    const button = screen.getByRole("button", { name: sharedCopy.gameTips });
    expect(screen.getByText(sharedCopy.tips)).toHaveClass("hidden", "sm:inline");
    fireEvent.click(button);
    expect(renderHook(() => useTipsRequested()).result.current).toBe(true);
  });
});
