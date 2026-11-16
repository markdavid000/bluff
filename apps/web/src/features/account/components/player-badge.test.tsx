import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { errorCopy } from "@/lib/copy";
import { type Notice, onNotice } from "@/lib/notify";
import { accountCopy } from "../copy";
import { PlayerBadge } from "./player-badge";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/components/shared/screen-controls", () => ({
  ScreenControls: ({ className }: { className?: string }) => (
    <div role="group" aria-label="Screen controls" className={className} />
  ),
}));

const signOut = vi.fn();
let open = false;
const setOpen = vi.fn((next: boolean) => {
  open = next;
});
let player: Record<string, unknown> = { status: "loading" };
let signingOut = false;

const profile = {
  panel: "main",
  nickname: "Dave",
  nicknameInvalid: false,
  face: 3,
  faces: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  saving: false,
  savingName: false,
  savingFace: false,
  confirmInWallet: false,
  canSaveName: true,
  editName: vi.fn(),
  editFace: vi.fn(),
  back: vi.fn(),
  changeNickname: vi.fn(),
  saveName: vi.fn(),
  chooseFace: vi.fn(),
};
let edit: Record<string, unknown> = profile;
const showTips = vi.fn();
vi.mock("@/hooks/use-tips-request", () => ({ showTips: () => showTips() }));

vi.mock("../hooks/use-player-badge", () => ({
  usePlayerBadge: () => ({ player, signOut, signingOut, open, setOpen, profile: edit }),
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
  signingOut = false;
  edit = profile;
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

  it("stays open while signing out, and says so when the player tries to close it", () => {
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    player = ready;
    open = true;
    signingOut = true;
    render(<PlayerBadge />);
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(setOpen).not.toHaveBeenCalled();
    expect(shown.map((notice) => notice.title)).toEqual([
      errorCopy.stillGoing(accountCopy.signingOut),
    ]);
    stop();
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

  it("keeps the header small on phones: the face only, with night mode and sounds moved into the card", () => {
    player = ready;
    open = true;
    render(<PlayerBadge />);
    expect(screen.getByText("Dave #4E31", { selector: "span" })).toHaveClass("hidden", "sm:inline");
    expect(screen.getByRole("group", { name: "Screen controls" })).toHaveClass("sm:hidden");
  });

  describe("the profile", () => {
    beforeEach(() => {
      player = ready;
      open = true;
    });

    it("offers to change the name and the face, the game tips, and signing out", () => {
      render(<PlayerBadge />);
      fireEvent.click(screen.getByRole("button", { name: accountCopy.changeName }));
      expect(profile.editName).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole("button", { name: accountCopy.changeFace }));
      expect(profile.editFace).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole("button", { name: accountCopy.gameTips }));
      expect(showTips).toHaveBeenCalledOnce();
      expect(setOpen).toHaveBeenCalledWith(false);
    });

    it("changes the name in the same field as the welcome screen", () => {
      edit = { ...profile, panel: "name" };
      render(<PlayerBadge />);
      const field = screen.getByLabelText(accountCopy.nicknameLabel);
      expect(field).toHaveValue("Dave");
      fireEvent.change(field, { target: { value: "Brave Otter" } });
      expect(profile.changeNickname).toHaveBeenCalledWith("Brave Otter");
      fireEvent.submit(screen.getByRole("button", { name: accountCopy.saveName }));
      expect(profile.saveName).toHaveBeenCalledOnce();
      fireEvent.click(screen.getByRole("button", { name: accountCopy.backToProfile }));
      expect(profile.back).toHaveBeenCalledOnce();
    });

    it("keeps Save off for a name someone else has", () => {
      edit = { ...profile, panel: "name", canSaveName: false };
      render(<PlayerBadge />);
      expect(screen.getByRole("button", { name: accountCopy.saveName })).toBeDisabled();
    });

    it("changes the face from the same twelve as the welcome screen", () => {
      edit = { ...profile, panel: "face" };
      render(<PlayerBadge />);
      expect(screen.getAllByRole("radio")).toHaveLength(12);
      expect(screen.getByRole("radio", { name: accountCopy.faceNumber(3) })).toBeChecked();
      fireEvent.click(screen.getByRole("radio", { name: accountCopy.faceNumber(7) }));
      expect(profile.chooseFace).toHaveBeenCalledWith(7);
    });

    it("stays open while a change is saving, and says so", () => {
      edit = { ...profile, panel: "face", saving: true, savingFace: true };
      const shown: Notice[] = [];
      const stop = onNotice((event) => {
        if (event.type === "show") shown.push(event.notice);
      });
      render(<PlayerBadge />);
      fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
      stop();
      expect(setOpen).not.toHaveBeenCalledWith(false);
      expect(shown.map((notice) => notice.title)).toContain(
        errorCopy.stillGoing(accountCopy.savingFace)
      );
    });
  });
});
