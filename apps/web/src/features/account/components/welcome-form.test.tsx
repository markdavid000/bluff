import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountCopy } from "../copy";
import { WelcomeForm } from "./welcome-form";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const welcome = {
  ready: true,
  nickname: "Brave Lion",
  nicknameInvalid: false,
  avatar: 3,
  faces: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12],
  working: false,
  suggesting: false,
  suggestion: 0,
  confirmInWallet: false,
  canSave: true,
  submitLabel: accountCopy.welcomeSubmit as string,
  workingLabel: accountCopy.welcomeWorking as string,
  changeNickname: vi.fn(),
  suggestAnother: vi.fn(),
  chooseAvatar: vi.fn(),
  submit: vi.fn(),
};

let state = { ...welcome };

vi.mock("../hooks/use-welcome", () => ({ useWelcome: () => state }));

beforeEach(() => {
  state = { ...welcome };
  vi.clearAllMocks();
});

describe("WelcomeForm", () => {
  it("starts with a suggested name, twelve faces and one chosen", () => {
    render(<WelcomeForm />);
    expect(screen.getByLabelText(accountCopy.nicknameLabel)).toHaveValue("Brave Lion");
    const faces = screen.getAllByRole("radio");
    expect(faces).toHaveLength(12);
    expect(screen.getByRole("radio", { name: accountCopy.faceNumber(3) })).toHaveAttribute(
      "aria-checked",
      "true"
    );
    expect(screen.getByRole("button", { name: accountCopy.welcomeSubmit })).toBeEnabled();
  });

  it("offers another name and lets a face be chosen", () => {
    render(<WelcomeForm />);
    fireEvent.click(screen.getByRole("button", { name: accountCopy.suggestAnother }));
    fireEvent.click(screen.getByRole("radio", { name: accountCopy.faceNumber(8) }));
    expect(state.suggestAnother).toHaveBeenCalledOnce();
    expect(state.chooseAvatar).toHaveBeenCalledWith(8);
  });

  it("marks a name the game will not accept without writing an error under it", () => {
    state = { ...welcome, nickname: "no", nicknameInvalid: true };
    render(<WelcomeForm />);
    expect(screen.getByLabelText(accountCopy.nicknameLabel)).toHaveAttribute(
      "aria-invalid",
      "true"
    );
    expect(screen.queryByText(accountCopy.nicknameInvalid)).not.toBeInTheDocument();
    expect(screen.getByText(accountCopy.nicknameHelp)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: accountCopy.welcomeSubmit })).toBeEnabled();
  });

  it("just says Save when today's chips were already claimed", () => {
    state = { ...welcome, submitLabel: accountCopy.welcomeSave };
    render(<WelcomeForm />);
    expect(screen.getByRole("button", { name: accountCopy.welcomeSave })).toBeEnabled();
    expect(
      screen.queryByRole("button", { name: accountCopy.welcomeSubmit })
    ).not.toBeInTheDocument();
  });

  it("shows the button thinking while a new name is found", async () => {
    state = { ...welcome, suggesting: true };
    render(<WelcomeForm />);
    expect(await screen.findByRole("button", { name: accountCopy.suggesting })).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("saves when submitted", () => {
    render(<WelcomeForm />);
    fireEvent.submit(screen.getByRole("button", { name: accountCopy.welcomeSubmit }));
    expect(state.submit).toHaveBeenCalledOnce();
  });

  it("shows the working words while saving", async () => {
    state = { ...welcome, working: true, canSave: false };
    render(<WelcomeForm />);
    expect(await screen.findByRole("button", { name: accountCopy.welcomeWorking })).toHaveAttribute(
      "aria-busy",
      "true"
    );
  });

  it("asks own-wallet players to confirm in their wallet", async () => {
    state = { ...welcome, working: true, confirmInWallet: true, canSave: false };
    render(<WelcomeForm />);
    expect(
      await screen.findByRole("button", { name: accountCopy.confirmInWallet })
    ).toBeInTheDocument();
  });
});
