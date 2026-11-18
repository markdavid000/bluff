import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { tableCopy } from "../../copy";
import type { GameHistoryList } from "../../hooks/use-game-history-list";
import type { HistoryGame } from "../../lib/game-log";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import { HistoryScreen } from "./history-screen";

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));

let history: GameHistoryList = { status: "loading" };
vi.mock("../../hooks/use-game-history-list", () => ({ useGameHistoryList: () => history }));

function game(id: bigint, overrides: Partial<HistoryGame> = {}): HistoryGame {
  return {
    table: {
      id,
      host: ME,
      status: "finished",
      isPrivate: false,
      seatCount: 2,
      buyIn: 10n * ONE_CHIP,
      deadline: 0,
      ...NO_GAME,
      startedAt: Date.UTC(2026, 10, 15, 12),
      round: 4,
      seats: [
        { player: ME, ready: true, isHost: true, isActive: true, ...NO_DICE, dice: 2 },
        { player: ADA, ready: true, isHost: false, isActive: false, ...NO_DICE },
      ],
    },
    outcome: { result: "won", winners: [ME], chips: 10n * ONE_CHIP },
    reason: "last-standing",
    ...overrides,
  };
}

function ready(games: HistoryGame[], more = false): GameHistoryList {
  return {
    status: "ready",
    games,
    more,
    loadingMore: false,
    loadMore: vi.fn(),
    nameOf: (address) => (address === ME ? "Favour" : "Ada"),
    faceOf: () => undefined,
  };
}

afterEach(() => {
  history = { status: "loading" };
});

describe("HistoryScreen", () => {
  it("says it's finding your games while it loads", () => {
    render(<HistoryScreen />);
    expect(screen.getByRole("heading", { name: tableCopy.pastTitle })).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(tableCopy.pastFinding);
  });

  it("invites you to play when you have no games", () => {
    history = ready([]);
    render(<HistoryScreen />);
    expect(screen.getByText(tableCopy.pastNone)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: tableCopy.playNow })).toHaveAttribute("href", "/play");
  });

  it("says it couldn't load, and tries again when asked", async () => {
    const retry = vi.fn();
    history = { status: "failed", retry };
    render(<HistoryScreen />);
    expect(screen.getByText(tableCopy.pastProblem)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.tryAgain }));
    expect(retry).toHaveBeenCalledOnce();
  });

  it("lists each game with its result and chips, and says when that's all", () => {
    history = ready([
      game(7n),
      game(5n, { outcome: { result: "lost", winners: [ADA], chips: -10n * ONE_CHIP } }),
    ]);
    render(<HistoryScreen />);
    const cards = screen.getAllByRole("button", { name: /^See Table/ });
    expect(cards).toHaveLength(2);
    expect(cards[0]).toHaveTextContent(tableCopy.pastResult.won);
    expect(cards[0]).toHaveTextContent(tableCopy.pastChipsUp("10"));
    expect(cards[1]).toHaveTextContent(tableCopy.pastResult.lost);
    expect(cards[1]).toHaveTextContent(tableCopy.pastChipsDown("10"));
    expect(screen.getByText(tableCopy.pastAll)).toBeInTheDocument();
  });

  it("opens a game's details: players, how it ended, rounds and the pot", async () => {
    history = ready([game(7n)]);
    render(<HistoryScreen />);
    fireEvent.click(screen.getByRole("button", { name: tableCopy.pastOpen("Table 7") }));
    const dialog = await screen.findByRole("dialog");
    expect(dialog).toHaveTextContent("Favour");
    expect(dialog).toHaveTextContent(tableCopy.pastDiceLeft(2));
    expect(dialog).toHaveTextContent(
      tableCopy.pastHowItEnded(tableCopy.pastEndedBy["last-standing"])
    );
    expect(dialog).toHaveTextContent(tableCopy.pastWonBy("Favour"));
    expect(dialog).toHaveTextContent(tableCopy.pastRounds(4));
    expect(dialog).toHaveTextContent(tableCopy.pastPot("20"));
    expect(dialog).toHaveTextContent(tableCopy.pastShare("Favour", "20"));
  });

  it("shows more games on request", async () => {
    history = ready([game(7n)], true);
    render(<HistoryScreen />);
    fireEvent.click(screen.getByRole("button", { name: tableCopy.pastMore }));
    expect(history.status === "ready" && history.loadMore).toHaveBeenCalledOnce();
    expect(screen.queryByText(tableCopy.pastAll)).not.toBeInTheDocument();
  });
});
