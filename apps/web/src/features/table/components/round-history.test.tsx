import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { tableCopy } from "../copy";
import { RoundHistory } from "./round-history";

const ADA = "0x0000000000000000000000000000000000003c4d";
const KOLA = "0x0000000000000000000000000000000000005e6f";
const nameOf = (player: string) => (player === ADA ? "Ada" : "Kola");

describe("RoundHistory", () => {
  it("lists this round's bids in order, and how earlier rounds ended", () => {
    render(
      <RoundHistory
        nameOf={nameOf}
        history={{
          status: "ready",
          rounds: [
            {
              round: 3,
              bids: [
                { player: ADA, quantity: 2, face: 4 },
                { player: KOLA, quantity: 3, face: 4 },
              ],
              end: null,
            },
            { round: 2, bids: [], end: { kind: "called", holds: true, loser: ADA } },
            { round: 1, bids: [], end: { kind: "timeout", player: KOLA } },
          ],
        }}
      />
    );
    const bids = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(bids).toEqual([
      expect.stringContaining(`${tableCopy.historyBidder("Ada")}${tableCopy.bid(2, "four")}`),
      expect.stringContaining(`${tableCopy.historyBidder("Kola")}${tableCopy.bid(3, "four")}`),
    ]);
    expect(screen.getByText(tableCopy.historyHeld("Ada"))).toBeInTheDocument();
    expect(screen.getByText(tableCopy.historyTimedOut("Kola"))).toBeInTheDocument();
  });

  it("says when a bluff was caught", () => {
    render(
      <RoundHistory
        nameOf={nameOf}
        history={{
          status: "ready",
          rounds: [{ round: 1, bids: [], end: { kind: "called", holds: false, loser: KOLA } }],
        }}
      />
    );
    expect(screen.getByText(tableCopy.historyCaught("Kola"))).toBeInTheDocument();
  });

  it("says when nobody has bid yet this round", () => {
    render(
      <RoundHistory
        nameOf={nameOf}
        history={{ status: "ready", rounds: [{ round: 1, bids: [], end: null }] }}
      />
    );
    expect(screen.getByText(tableCopy.historyNoBids)).toBeInTheDocument();
  });

  it("shows a placeholder while the rounds load", () => {
    render(<RoundHistory nameOf={nameOf} history={{ status: "loading" }} />);
    expect(screen.getByRole("status")).toHaveTextContent(tableCopy.loading);
  });

  it("offers to try again when the rounds can't be read", () => {
    const retry = vi.fn();
    render(<RoundHistory nameOf={nameOf} history={{ status: "failed", retry }} />);
    expect(screen.getByText(tableCopy.historyProblem)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("can be folded away", () => {
    render(<RoundHistory nameOf={nameOf} history={{ status: "loading" }} />);
    const panel = screen.getByRole("group");
    fireEvent.click(screen.getByText(tableCopy.history));
    expect(panel).not.toHaveAttribute("open");
  });

  it("folds open and shut smoothly rather than snapping", () => {
    render(<RoundHistory nameOf={nameOf} history={{ status: "loading" }} />);
    expect(screen.getByRole("group")).toHaveClass("smooth-details");
  });
});
