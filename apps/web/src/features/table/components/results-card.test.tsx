import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { tableCopy } from "../copy";
import { aTable, gameView, ME } from "../lib/game-view.testing";
import { ResultsCard } from "./results-card";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

const playAgain = vi.fn();
const joinOffer = vi.fn();
let again: Record<string, unknown> = {};
vi.mock("../hooks/use-play-again", () => ({
  usePlayAgain: () => ({ playAgain, joinOffer, ...again }),
}));

beforeEach(() => {
  again = { offer: null, playing: false, joining: false, busy: false, confirm: false };
  vi.clearAllMocks();
});

const finished = (buyIn = 0n) => aTable({ status: "finished", buyIn });

describe("ResultsCard", () => {
  it("tells the player they won, not their own name, and lists everyone's dice", () => {
    render(
      <ResultsCard
        game={gameView({
          table: finished(),
          end: { status: "ready", reason: "last-standing", winners: [ME] },
          winnerNames: [tableCopy.you],
          iWon: true,
        })}
      />
    );
    expect(screen.getByRole("heading", { name: tableCopy.youWin })).toBeInTheDocument();
    expect(screen.getByText(tableCopy.finalDice)).toBeInTheDocument();
    expect(screen.getByText("Sly Fox #3C4D")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: tableCopy.backToLobby })).toHaveAttribute(
      "href",
      "/play"
    );
  });

  it("shows a player who left as out, not with the dice they left behind", () => {
    const base = gameView();
    const [me, fox] = base.seats;
    if (!me || !fox) throw new Error("Expected two seats.");
    render(
      <ResultsCard
        game={gameView({
          table: finished(),
          seats: [me, { ...fox, isActive: false, dice: 4 }],
          end: { status: "ready", reason: "others-left", winners: [ME] },
          winnerNames: [tableCopy.you],
          iWon: true,
        })}
      />
    );
    expect(screen.getByText(tableCopy.out)).toBeInTheDocument();
  });

  it("names the winner when it's someone else", () => {
    render(
      <ResultsCard
        game={gameView({
          table: finished(),
          end: { status: "ready", reason: "last-standing", winners: ["0x0"] },
          winnerNames: ["Sly Fox #3C4D"],
        })}
      />
    );
    expect(
      screen.getByRole("heading", { name: tableCopy.winner("Sly Fox #3C4D") })
    ).toBeInTheDocument();
  });

  it("names everyone who shares a win when the clock ran out", () => {
    render(
      <ResultsCard
        game={gameView({
          table: finished(),
          end: { status: "ready", reason: "clock", winners: [ME, "0x0"] },
          winnerNames: ["Me #1A2B", "Sly Fox #3C4D"],
        })}
      />
    );
    expect(
      screen.getByRole("heading", { name: tableCopy.winners("Me #1A2B, Sly Fox #3C4D") })
    ).toBeInTheDocument();
  });

  it("tells the winner of a paid table how many chips they won", () => {
    render(
      <ResultsCard
        game={gameView({
          table: finished(10n * ONE_CHIP),
          end: { status: "ready", reason: "last-standing", winners: [ME] },
          winnerNames: ["Me #1A2B"],
          myShare: 20n * ONE_CHIP,
        })}
      />
    );
    expect(screen.getByText(tableCopy.youWon("20"))).toBeInTheDocument();
  });

  it("never claims chips were won at a free table", () => {
    render(
      <ResultsCard
        game={gameView({
          table: finished(),
          end: { status: "ready", reason: "last-standing", winners: [ME] },
          winnerNames: ["Me #1A2B"],
          myShare: 0n,
        })}
      />
    );
    expect(screen.queryByText(/You won/)).toBeNull();
  });

  it("offers to try again when the winner could not be read", () => {
    const retry = vi.fn();
    render(
      <ResultsCard game={gameView({ table: finished(), end: { status: "failed", retry } })} />
    );
    expect(screen.getByText(tableCopy.winnerProblem)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("says when the winner is too far back to read, instead of guessing", () => {
    render(<ResultsCard game={gameView({ table: finished(), end: { status: "unknown" } })} />);
    expect(screen.getByRole("heading", { name: tableCopy.gameOver })).toBeInTheDocument();
    expect(screen.getByText(tableCopy.winnerUnknown)).toBeInTheDocument();
  });

  describe("playing again", () => {
    it("offers to play again with the same settings", () => {
      render(<ResultsCard game={gameView({ table: finished() })} />);
      fireEvent.click(screen.getByRole("button", { name: tableCopy.playAgain }));
      expect(playAgain).toHaveBeenCalledOnce();
    });

    it("offers the new table someone from the game set up", () => {
      again = {
        ...again,
        offer: { id: 20n, hostName: "Sly Fox #3C4D", buyIn: 0n, isPrivate: false },
      };
      render(<ResultsCard game={gameView({ table: finished() })} />);
      fireEvent.click(
        screen.getByRole("button", { name: tableCopy.joinNewTable("Sly Fox #3C4D") })
      );
      expect(joinOffer).toHaveBeenCalledOnce();
    });

    it("names the chips when the new table is paid", () => {
      again = {
        ...again,
        offer: { id: 20n, hostName: "Sly Fox #3C4D", buyIn: 10n * ONE_CHIP, isPrivate: false },
      };
      render(<ResultsCard game={gameView({ table: finished(10n * ONE_CHIP) })} />);
      expect(
        screen.getByRole("button", {
          name: tableCopy.payAndJoinNewTable("10", "Sly Fox #3C4D"),
        })
      ).toBeInTheDocument();
    });

    it("says to ask for the link when the new table is private", () => {
      again = {
        ...again,
        offer: { id: 20n, hostName: "Sly Fox #3C4D", buyIn: 0n, isPrivate: true },
      };
      render(<ResultsCard game={gameView({ table: finished() })} />);
      expect(screen.getByText(tableCopy.newPrivateTable("Sly Fox #3C4D"))).toBeInTheDocument();
      expect(screen.queryByRole("button", { name: /new table/ })).toBeNull();
    });

    it("shows the table being set up while it lands", () => {
      again = { ...again, playing: true, busy: true };
      render(<ResultsCard game={gameView({ table: finished() })} />);
      expect(screen.getByRole("button", { name: tableCopy.playingAgain })).toBeInTheDocument();
    });
  });
});
