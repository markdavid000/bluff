import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { accountCopy } from "../copy";
import { SignInPanel } from "./sign-in-panel";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const signIn = vi.fn();
let state: { kind: string; method?: string } = { kind: "idle" };

vi.mock("../hooks/use-sign-in", () => ({
  useSignIn: () => ({ ready: true, state, signIn }),
}));

beforeEach(() => {
  state = { kind: "idle" };
  vi.clearAllMocks();
});

describe("SignInPanel", () => {
  it("leads with Google and email, and keeps a wallet as a quiet link below", () => {
    render(<SignInPanel next={undefined} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons.map((button) => button.textContent)).toEqual([
      accountCopy.google,
      accountCopy.email,
      accountCopy.ownWallet,
    ]);
    const wallet = screen.getByRole("button", { name: accountCopy.ownWallet });
    expect(wallet).toHaveAttribute("data-variant", "link");
    expect(accountCopy.ownWallet).toBe("I already have a wallet");
  });

  it("signs in with the method chosen", () => {
    render(<SignInPanel next={undefined} />);
    fireEvent.click(screen.getByRole("button", { name: accountCopy.ownWallet }));
    expect(signIn).toHaveBeenCalledWith("wallet");
    fireEvent.click(screen.getByRole("button", { name: accountCopy.google }));
    expect(signIn).toHaveBeenCalledWith("google");
  });

  it("holds every option while a sign in is running", () => {
    state = { kind: "working", method: "google" };
    render(<SignInPanel next={undefined} />);
    expect(screen.getByRole("button", { name: accountCopy.ownWallet })).toBeDisabled();
    expect(screen.getByRole("button", { name: accountCopy.email })).toBeDisabled();
  });
});
