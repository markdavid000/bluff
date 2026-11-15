import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { chipsCopy } from "../copy";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ChipsPanel } from "./chips-panel";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const reveal = vi.fn();
const retry = vi.fn();
const claim = vi.fn();
const resume = vi.fn();
const setCashOutOpen = vi.fn();

type Panel = Parameters<typeof ChipsPanel>[0]["panel"];

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
  pendingRetry: null,
};

let panel: Panel = base;

function showPanel() {
  render(
    <Dialog open>
      <DialogContent>
        <ChipsPanel panel={panel} />
      </DialogContent>
    </Dialog>
  );
}

beforeEach(() => {
  panel = { ...base };
  vi.clearAllMocks();
});

describe("ChipsPanel", () => {
  it("shows the balance, the free chips and cash out", () => {
    showPanel();
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
    showPanel();
    expect(screen.getByRole("status")).toHaveTextContent(chipsCopy.balanceLoading);
    expect(screen.getByRole("button", { name: chipsCopy.cashOut })).toBeDisabled();
  });

  it("asks before showing hidden chips", () => {
    panel = {
      ...base,
      balance: { status: "hidden", reveal, revealing: false, asksWallet: true },
      canCashOut: false,
    };
    showPanel();
    expect(screen.getByText(chipsCopy.showChipsHelp)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.showChips }));
    expect(reveal).toHaveBeenCalledOnce();
  });

  it("explains a failed count and offers to try again", () => {
    panel = { ...base, balance: { status: "failed", retry }, canCashOut: false };
    showPanel();
    expect(screen.getByText(chipsCopy.balanceProblem)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("counts down when the free chips are not ready yet", () => {
    panel = { ...base, claim: { status: "waiting", remainingMs: (2 * 3600 + 5 * 60 + 9) * 1000 } };
    showPanel();
    expect(screen.getByRole("timer")).toHaveAccessibleName(`${chipsCopy.claimNext} 02:05:09`);
    expect(screen.queryByRole("button", { name: chipsCopy.claim })).not.toBeInTheDocument();
  });

  it("offers to finish an unfinished cash out, and holds new ones until then", () => {
    panel = { ...base, resume, canCashOut: false };
    showPanel();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutResume }));
    expect(resume).toHaveBeenCalledOnce();
    expect(screen.getByRole("button", { name: chipsCopy.cashOut })).toBeDisabled();
  });

  it("offers to try again when the free chips can't be checked", () => {
    const retry = vi.fn();
    panel = { ...base, claim: { status: "failed", retry } };
    showPanel();
    expect(screen.getByText(chipsCopy.claimProblem)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("holds cash outs and offers to try again when an unfinished one can't be checked", () => {
    const pendingRetry = vi.fn();
    panel = { ...base, canCashOut: false, pendingRetry };
    showPanel();
    expect(screen.getByText(chipsCopy.pendingProblem)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: chipsCopy.cashOut })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.tryAgain }));
    expect(pendingRetry).toHaveBeenCalledOnce();
  });

  it("shows cashed out practice dollars and where anyone can see them", () => {
    panel = { ...base, cashOut: { ...base.cashOut, dollars: 25_000_000n } };
    showPanel();
    expect(screen.getAllByText(chipsCopy.dollars("25"))).not.toHaveLength(0);
    const record = screen.getByRole("link", { name: chipsCopy.seeCashOuts });
    expect(record).toHaveAttribute("href", "https://sepolia.etherscan.io/token/0xdo?a=0xme");
    expect(record).toHaveAttribute("target", "_blank");
  });
});
