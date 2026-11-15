import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import { type Reveal, RevealCard } from "./reveal-card";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const reveal: Reveal = {
  outcome: "caught",
  quantity: 5,
  face: 5,
  count: 4,
  loserName: "Ada",
  loserIsMe: false,
  rows: [
    {
      name: "Ada",
      isMe: false,
      faces: [5, 2, 1],
      counting: [true, false, true],
      matches: 2,
      role: "bidder",
    },
    {
      name: "Me",
      isMe: true,
      faces: [5, 5, 3],
      counting: [true, true, false],
      matches: 2,
      role: "caller",
    },
  ],
};

describe("RevealCard", () => {
  it("stamps the outcome and says who loses a die", () => {
    render(<RevealCard reveal={reveal} onContinue={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: tableCopy.bluffCaught })).toBeInTheDocument();
    expect(
      screen.getByText(`${tableCopy.roundResult(4, "five")} ${tableCopy.lostADie("Ada")}`)
    ).toBeInTheDocument();
  });

  it("says when the bid holds", () => {
    render(<RevealCard reveal={{ ...reveal, outcome: "holds" }} onContinue={vi.fn()} />);
    expect(screen.getByRole("dialog", { name: tableCopy.bidHolds })).toBeInTheDocument();
  });

  it("shows every player's dice, who bid and who called, and how many matched", () => {
    render(<RevealCard reveal={reveal} onContinue={vi.fn()} />);
    expect(screen.getByText(tableCopy.bidderTag)).toBeInTheDocument();
    expect(screen.getByText(tableCopy.callerTag)).toBeInTheDocument();
    expect(screen.getAllByText(tableCopy.matched(2))).toHaveLength(2);
    expect(screen.getAllByRole("img", { name: "five" })).toHaveLength(3);
  });

  it("tells the player when it was their die that was lost", () => {
    render(<RevealCard reveal={{ ...reveal, loserIsMe: true }} onContinue={vi.fn()} />);
    expect(screen.getByText(new RegExp(tableCopy.youLostADie))).toBeInTheDocument();
  });

  it("moves on when the player presses Continue", () => {
    const onContinue = vi.fn();
    render(<RevealCard reveal={reveal} onContinue={onContinue} />);
    fireEvent.click(screen.getByRole("button", { name: tableCopy.continueGame }));
    expect(onContinue).toHaveBeenCalledOnce();
  });

  it("shows nothing between reveals", () => {
    render(<RevealCard reveal={null} onContinue={vi.fn()} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
