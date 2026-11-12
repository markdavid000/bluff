import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { chipsCopy } from "../copy";
import { CashOutDialog } from "./cash-out-dialog";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const cashOut = vi.fn();
const onOpenChange = vi.fn();

function open(props: Partial<Parameters<typeof CashOutDialog>[0]> = {}) {
  render(
    <CashOutDialog
      open
      onOpenChange={onOpenChange}
      balance={40n * ONE_CHIP}
      working={false}
      confirmInWallet={false}
      cashOut={cashOut}
      {...props}
    />
  );
  return screen.getByLabelText(chipsCopy.cashOutAmount);
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("CashOutDialog", () => {
  it("cashes out the exact number of chips typed", () => {
    fireEvent.change(open(), { target: { value: "12.5" } });
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutSome }));
    expect(cashOut).toHaveBeenCalledWith(12n * ONE_CHIP + ONE_CHIP / 2n);
  });

  it("cashes out everything in one tap", () => {
    open();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutAll }));
    expect(cashOut).toHaveBeenCalledWith("everything");
  });

  it("explains an amount that is not a number of chips", () => {
    const input = open();
    fireEvent.change(input, { target: { value: "lots" } });
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutSome }));
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(screen.getByText(chipsCopy.cashOutInvalid)).toBeInTheDocument();
    expect(cashOut).not.toHaveBeenCalled();
  });

  it("refuses more chips than the player has", () => {
    fireEvent.change(open(), { target: { value: "41" } });
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutSome }));
    expect(screen.getByText(chipsCopy.cashOutTooMany("40"))).toBeInTheDocument();
    expect(cashOut).not.toHaveBeenCalled();
  });

  it("stays open while the cash out is running", () => {
    open({ working: true });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: chipsCopy.cashOutAll })).toBeDisabled();
  });
});
