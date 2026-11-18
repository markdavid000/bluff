import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Bid } from "@bluff/game";
import { tableCopy } from "../copy";
import { useBidChoice } from "../hooks/use-bid-choice";
import { BidControl } from "./bid-control";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const onRaise = vi.fn();
const onCall = vi.fn();

function Harness({ bid, busy = false }: { bid: Bid | null; busy?: boolean }) {
  const choice = useBidChoice(bid, 8, [5, 1, 3]);
  return (
    <BidControl
      choice={choice}
      bid={bid}
      bidderName={bid ? "Ada" : null}
      placing={false}
      calling={false}
      confirm={false}
      busy={busy}
      onRaise={onRaise}
      onCall={onCall}
    />
  );
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("BidControl", () => {
  it("starts on the lowest bid allowed and raises it in one tap", () => {
    render(<Harness bid={{ quantity: 4, face: 5 }} />);
    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: tableCopy.pickFace("sixes") })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
    fireEvent.click(screen.getByRole("button", { name: tableCopy.raise }));
    expect(onRaise).toHaveBeenCalledWith({ quantity: 4, face: 6 });
  });

  it("changes the quantity and face with the stepper and the faces", () => {
    render(<Harness bid={{ quantity: 4, face: 5 }} />);
    fireEvent.click(screen.getByRole("button", { name: tableCopy.oneMore }));
    fireEvent.click(screen.getByRole("button", { name: tableCopy.pickFace("threes") }));
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: tableCopy.pickFace("threes") })).toHaveAttribute(
      "aria-pressed",
      "true"
    );
  });

  it("never lets the quantity drop below what's allowed", () => {
    render(<Harness bid={{ quantity: 4, face: 5 }} />);
    expect(screen.getByRole("button", { name: tableCopy.oneFewer })).toBeDisabled();
  });

  it("calls the bluff on whoever made the last bid", () => {
    render(<Harness bid={{ quantity: 4, face: 5 }} />);
    fireEvent.click(screen.getByRole("button", { name: tableCopy.callBluffOn("Ada") }));
    expect(onCall).toHaveBeenCalledOnce();
  });

  it("offers no call before the first bid of a round", () => {
    render(<Harness bid={null} />);
    expect(screen.queryByRole("button", { name: /call bluff/i })).toBeNull();
    expect(screen.getByRole("button", { name: tableCopy.raise })).toBeEnabled();
  });

  it("leaves only the call at the top bid", () => {
    render(<Harness bid={{ quantity: 8, face: 6 }} />);
    expect(screen.getByText(tableCopy.topBid)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: tableCopy.raise })).toBeNull();
    expect(screen.getByRole("button", { name: tableCopy.callBluffOn("Ada") })).toBeEnabled();
  });

  it("holds every choice while a move is landing", () => {
    render(<Harness bid={{ quantity: 4, face: 5 }} busy />);
    expect(screen.getByRole("button", { name: tableCopy.oneMore })).toBeDisabled();
    expect(screen.getByRole("button", { name: tableCopy.pickFace("threes") })).toBeDisabled();
  });
});
