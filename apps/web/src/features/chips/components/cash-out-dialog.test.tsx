import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorCopy } from "@/lib/copy";
import { onNotice } from "@/lib/notify";
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

let shown: string[] = [];
let stop: () => void = () => undefined;

function toasts() {
  return shown;
}

beforeEach(() => {
  vi.clearAllMocks();
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice.title);
  });
});

afterEach(() => stop());

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

  it("asks for an amount in a short toast when none is typed", () => {
    const input = open();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutSome }));
    expect(toasts()).toEqual([chipsCopy.cashOutEmpty]);
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(cashOut).not.toHaveBeenCalled();
  });

  it("asks for a number of chips in a toast, not under the box", () => {
    const input = open();
    fireEvent.change(input, { target: { value: "lots" } });
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutSome }));
    expect(toasts()).toEqual([chipsCopy.cashOutInvalid]);
    expect(screen.queryByText(chipsCopy.cashOutInvalid)).not.toBeInTheDocument();
    expect(cashOut).not.toHaveBeenCalled();
  });

  it("says how many chips to pick at most when the player asks for too many", () => {
    fireEvent.change(open(), { target: { value: "41" } });
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutSome }));
    expect(toasts()).toEqual([chipsCopy.cashOutTooMany("40")]);
    expect(cashOut).not.toHaveBeenCalled();
  });

  it("clears the warning as soon as the player types again", () => {
    const input = open();
    fireEvent.click(screen.getByRole("button", { name: chipsCopy.cashOutSome }));
    fireEvent.change(input, { target: { value: "5" } });
    expect(input).not.toHaveAttribute("aria-invalid", "true");
  });

  it("stays open while the cash out is running, and says so when the player tries to close it", () => {
    open({ working: true });
    fireEvent.keyDown(document.activeElement ?? document.body, { key: "Escape" });
    expect(onOpenChange).not.toHaveBeenCalled();
    expect(toasts()).toContain(errorCopy.stillGoing(chipsCopy.cashOutWorking));
    expect(screen.getByRole("button", { name: chipsCopy.cashOutAll })).toBeDisabled();
  });
});
