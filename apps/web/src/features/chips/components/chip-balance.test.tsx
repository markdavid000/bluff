import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { chipsCopy } from "../copy";
import type { ChipBalance as Balance } from "../hooks/use-chip-balance";
import { ChipBalance } from "./chip-balance";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const useChipBalance = vi.fn<(options: { automaticPermit: boolean }) => Balance>();
vi.mock("../hooks/use-chip-balance", () => ({
  useChipBalance: (options: { automaticPermit: boolean }) => useChipBalance(options),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

describe("ChipBalance", () => {
  it("is the one place that opens the chips without asking", () => {
    useChipBalance.mockReturnValue({ status: "loading" });
    render(<ChipBalance />);
    expect(useChipBalance).toHaveBeenCalledWith({ automaticPermit: true });
    expect(screen.getByRole("status")).toHaveTextContent(chipsCopy.balanceLoading);
  });

  it("shows the chips in the header", () => {
    useChipBalance.mockReturnValue({ status: "ready", amount: 1_250n * ONE_CHIP });
    render(<ChipBalance />);
    expect(screen.getAllByText(chipsCopy.balance("1,250"))).not.toHaveLength(0);
  });

  it("offers to show hidden chips", () => {
    const reveal = vi.fn();
    useChipBalance.mockReturnValue({
      status: "hidden",
      reveal,
      revealing: false,
      asksWallet: false,
    });
    render(<ChipBalance />);
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.showChips }));
    expect(reveal).toHaveBeenCalledOnce();
  });

  it("offers to try again after a failed count", () => {
    const retry = vi.fn();
    useChipBalance.mockReturnValue({ status: "failed", retry });
    render(<ChipBalance />);
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });
});
