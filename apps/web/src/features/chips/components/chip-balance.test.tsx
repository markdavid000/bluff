import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { ChipBalance as Balance } from "@/hooks/use-chip-balance";
import { ONE_CHIP } from "@/lib/chips";
import { chipsCopy } from "../copy";
import { ChipBalance } from "./chip-balance";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("./chips-panel", () => ({ ChipsPanel: () => <p>chips card</p> }));

let balance: Balance = { status: "loading" };
let needsYou = false;
let open = false;
const setOpen = vi.fn((next: boolean) => {
  open = next;
});

vi.mock("../hooks/use-chip-balance-button", () => ({
  useChipBalanceButton: () => ({ balance, open, setOpen, needsYou }),
}));

beforeEach(() => {
  balance = { status: "loading" };
  needsYou = false;
  open = false;
  vi.clearAllMocks();
});

describe("ChipBalance", () => {
  it("shows a placeholder while the chips are counted", () => {
    render(<ChipBalance />);
    expect(screen.getByRole("status")).toHaveTextContent(chipsCopy.balanceLoading);
  });

  it("shows the chips in the header, and opens the chips card when tapped", () => {
    balance = { status: "ready", amount: 1_250n * ONE_CHIP };
    const { rerender } = render(<ChipBalance />);
    expect(screen.getAllByText(chipsCopy.balance("1,250"))).not.toHaveLength(0);
    expect(screen.queryByText("chips card")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.openChips }));
    expect(setOpen).toHaveBeenCalledWith(true);
    rerender(<ChipBalance />);
    expect(screen.getByRole("dialog")).toHaveTextContent("chips card");
  });

  it("marks the chips when free chips or an unfinished cash out are waiting", () => {
    balance = { status: "ready", amount: 0n };
    needsYou = true;
    render(<ChipBalance />);
    expect(screen.getByText(chipsCopy.needsYou)).toBeInTheDocument();
  });

  it("offers to show hidden chips", () => {
    const reveal = vi.fn();
    balance = { status: "hidden", reveal, revealing: false, asksWallet: false };
    render(<ChipBalance />);
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.showChips }));
    expect(reveal).toHaveBeenCalledOnce();
  });

  it("opens the chips card to try again after a failed count", () => {
    balance = { status: "failed", retry: vi.fn() };
    render(<ChipBalance />);
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.openChips }));
    expect(setOpen).toHaveBeenCalledWith(true);
  });
});
