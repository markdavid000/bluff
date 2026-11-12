import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountCopy } from "../copy";
import { PlayerBadge } from "./player-badge";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const signOut = vi.fn();
let open = false;
const setOpen = vi.fn((next: boolean) => {
  open = next;
});
let player: Record<string, unknown> = { status: "loading" };

vi.mock("../hooks/use-player-badge", () => ({
  usePlayerBadge: () => ({ player, signOut, signingOut: false, open, setOpen }),
}));

const ready = {
  status: "ready",
  address: "0x00000000000000000000000000000000000a11ce",
  name: "Dave #4E31",
  nickname: "Dave",
  avatar: 3,
  avatarSrc: "/avatars/3.svg",
};

beforeEach(() => {
  player = { status: "loading" };
  open = false;
  vi.clearAllMocks();
});

describe("PlayerBadge", () => {
  it("shows a placeholder until the player is known", () => {
    const { container } = render(<PlayerBadge />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();
    expect(container.querySelector(".animate-pulse")).not.toBeNull();
  });

  it("offers to try again when the name could not be loaded", () => {
    const refresh = vi.fn();
    player = { status: "failed", refresh };
    render(<PlayerBadge />);
    fireEvent.click(screen.getByRole("button", { name: accountCopy.tryAgain }));
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("is a raised button with the player's face and name, and no sign out beside it", () => {
    player = ready;
    render(<PlayerBadge />);
    expect(
      screen.getByRole("button", { name: accountCopy.openPlayer("Dave #4E31") })
    ).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: accountCopy.signOut })).not.toBeInTheDocument();
  });

  it("opens the player's card, where they can sign out", () => {
    player = ready;
    const { rerender } = render(<PlayerBadge />);
    fireEvent.click(screen.getByRole("button", { name: accountCopy.openPlayer("Dave #4E31") }));
    expect(setOpen).toHaveBeenCalledWith(true);
    rerender(<PlayerBadge />);
    expect(screen.getByRole("dialog", { name: "Dave #4E31" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: accountCopy.signOut }));
    expect(signOut).toHaveBeenCalledOnce();
  });
});
