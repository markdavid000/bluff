import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { ActionButton } from "./action-button";

const play = vi.fn();

vi.mock("@/hooks/use-sound", () => ({
  useSound: () => ({ play, stop: vi.fn() }),
}));

describe("ActionButton", () => {
  it.each([
    ["large", "max-[40rem]:min-h-12"],
    ["medium", "max-[40rem]:min-h-10"],
    ["small", "max-[40rem]:min-h-9"],
  ] as const)("is shorter and narrower on a phone at %s size", (size, phoneHeight) => {
    render(<ActionButton size={size}>Go</ActionButton>);
    expect(screen.getByRole("button", { name: "Go" })).toHaveClass(phoneHeight);
  });

  it("shows its label when ready, and is not busy", () => {
    render(<ActionButton workingLabel="Signing you out…">Sign out</ActionButton>);
    const button = screen.getByRole("button", { name: "Sign out" });
    expect(button).not.toHaveAttribute("aria-busy");
  });

  it("changes to the working words and is marked busy while it works", async () => {
    const { rerender } = render(
      <ActionButton workingLabel="Signing you out…">Sign out</ActionButton>
    );
    rerender(
      <ActionButton working workingLabel="Signing you out…">
        Sign out
      </ActionButton>
    );
    const button = await screen.findByRole("button", { name: "Signing you out…" });
    expect(button).toHaveAttribute("aria-busy", "true");
  });

  it("changes back to its label when the work is done", async () => {
    const { rerender } = render(
      <ActionButton working workingLabel="Signing you out…">
        Sign out
      </ActionButton>
    );
    rerender(<ActionButton workingLabel="Signing you out…">Sign out</ActionButton>);
    await waitFor(() => expect(screen.getByRole("button")).toHaveAccessibleName("Sign out"));
  });

  it("plays its sound the moment it is pressed", () => {
    play.mockClear();
    render(
      <ActionButton sound="drum" onClick={() => undefined}>
        Call bluff
      </ActionButton>
    );
    fireEvent.pointerDown(screen.getByRole("button"));
    expect(play).toHaveBeenCalledWith("drum");
  });
});
