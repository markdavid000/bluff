import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { chipsCopy } from "../copy";
import { ChipsPanel } from "./chips-panel";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const reveal = vi.fn();
const retry = vi.fn();
const claim = vi.fn();
const resume = vi.fn();
const setCashOutOpen = vi.fn();

type Panel = Record<string, unknown>;

const base: Panel = {
  balance: { status: "ready", amount: 150n * ONE_CHIP },
  claim: { status: "ready", claim, working: false, confirmInWallet: false },
  cashOut: {
    dollars: 0n,
    publicRecord: "https://sepolia.etherscan.io/token/0xdo?a=0xme",
    cashOut: vi.fn(),
    resume,
    working: false,
    confirmInWallet: false,
  },
  cashOutOpen: false,
  setCashOutOpen,
  canCashOut: true,
  resume: null,
};

let panel: Panel = base;

vi.mock("../hooks/use-chips-panel", () => ({ useChipsPanel: () => panel }));

beforeEach(() => {
  panel = { ...base };
  vi.clearAllMocks();
});

describe("ChipsPanel", () => {
  it("shows the balance, the free chips and cash out", () => {
    render(<ChipsPanel />);
    expect(screen.getAllByText("150")).not.toHaveLength(0);
    expect(screen.queryByText(chipsCopy.seeCashOuts)).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.claim }));
    expect(claim).toHaveBeenCalledOnce();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOut }));
    expect(setCashOutOpen).toHaveBeenCalledWith(true);
  });

  it("shows a placeholder while the chips are being counted", () => {
    panel = {
      ...base,
      balance: { status: "loading" },
      claim: { status: "loading" },
      canCashOut: false,
    };
    render(<ChipsPanel />);
    expect(screen.getByRole("status")).toHaveTextContent(chipsCopy.balanceLoading);
    expect(screen.getByRole("button", { name: chipsCopy.cashOut })).toBeDisabled();
  });

  it("asks before showing hidden chips", () => {
    panel = {
      ...base,
      balance: { status: "hidden", reveal, revealing: false, asksWallet: true },
      canCashOut: false,
    };
    render(<ChipsPanel />);
    expect(screen.getByText(chipsCopy.showChipsHelp)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.showChips }));
    expect(reveal).toHaveBeenCalledOnce();
  });

  it("explains a failed count and offers to try again", () => {
    panel = { ...base, balance: { status: "failed", retry }, canCashOut: false };
    render(<ChipsPanel />);
    expect(screen.getByText(chipsCopy.balanceProblem)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("counts down when the free chips are not ready yet", () => {
    panel = { ...base, claim: { status: "waiting", remainingMs: (2 * 3600 + 5 * 60 + 9) * 1000 } };
    render(<ChipsPanel />);
    expect(screen.getByRole("timer")).toHaveAccessibleName(`${chipsCopy.claimNext} 02:05:09`);
    expect(screen.queryByRole("button", { name: chipsCopy.claim })).not.toBeInTheDocument();
  });

  it("offers to finish an unfinished cash out, and holds new ones until then", () => {
    panel = { ...base, resume, canCashOut: false };
    render(<ChipsPanel />);
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutResume }));
    expect(resume).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: chipsCopy.cashOut })).toBeDisabled();
  });

  it("shows cashed out practice dollars and where anyone can see them", () => {
    panel = { ...base, cashOut: { ...(base.cashOut as object), dollars: 25_000_000n } };
    render(<ChipsPanel />);
    expect(screen.getAllByText(chipsCopy.dollars("25"))).not.toHaveLength(0);
    const record = screen.getByRole("link", { name: chipsCopy.seeCashOuts });
    expect(record).toHaveAttribute("href", "https://sepolia.etherscan.io/token/0xdo?a=0xme");
    expect(record).toHaveAttribute("target", "_blank");
  });
});
