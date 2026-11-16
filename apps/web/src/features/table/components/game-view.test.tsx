import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { tableCopy } from "../copy";
import { aTable, gameView } from "../lib/game-view.testing";
import { GameView } from "./game-view";

vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play: vi.fn(), stop: vi.fn() }) }));
vi.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => null }));

let wide = false;
let waitingForDice = false;
vi.mock("../hooks/use-game-board", () => ({
  useGameBoard: () => ({ throwState: { kind: "idle" }, othersShaking: false, waitingForDice }),
}));
const historyWanted: boolean[] = [];
vi.mock("@/hooks/use-media-query", () => ({ useMediaQuery: () => wide }));
vi.mock("../hooks/use-round-history", () => ({
  useGameHistory: (_table: unknown, enabled: boolean) => {
    historyWanted.push(enabled);
    return { status: "ready", rounds: [{ round: 3, bids: [], end: null }] };
  },
}));

beforeEach(() => {
  wide = false;
  waitingForDice = false;
  historyWanted.length = 0;
});

const playing = (buyIn = 0n) => aTable({ status: "playing", buyIn, round: 3 });

describe("GameView", () => {
  it("shows the rounds so far beside the board on a laptop", () => {
    wide = true;
    render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.getByText(tableCopy.history)).toBeInTheDocument();
    expect(screen.getByText(tableCopy.historyNoBids)).toBeInTheDocument();
    expect(historyWanted.every(Boolean)).toBe(true);
  });

  it("keeps phones to one screen, without the rounds panel or its reads", () => {
    render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.queryByText(tableCopy.history)).toBeNull();
    expect(historyWanted.some(Boolean)).toBe(false);
  });

  it("shows the round, the dice in play and the game clock in one slim strip", () => {
    render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.getByRole("group", { name: tableCopy.roundLine(3, 8) })).toBeInTheDocument();
    expect(screen.getByRole("timer", { name: /Game ends in 10:00/ })).toBeInTheDocument();
  });

  it("puts the current bid beside the round, naming who made it", () => {
    render(<GameView game={gameView({ table: playing(), myTurn: false })} />);
    expect(screen.getByText(tableCopy.bid(3, "four"))).toBeInTheDocument();
    expect(screen.getByText("Sly Fox #3C4D", { selector: "span.truncate" })).toBeInTheDocument();
  });

  it("says there's no bid yet at the start of a round", () => {
    render(<GameView game={gameView({ table: playing(), bid: null, bidderName: null })} />);
    expect(screen.getByText(tableCopy.noBidYet)).toBeInTheDocument();
  });

  it("leaves the bottom line empty while the dice are revealed", () => {
    render(
      <GameView
        game={gameView({
          table: aTable({ status: "revealing", round: 3 }),
          myTurn: false,
          line: tableCopy.revealing,
        })}
      />
    );
    expect(screen.getByRole("status")).toBeEmptyDOMElement();
  });

  it("offers the bid control only on the player's turn", () => {
    render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.getByRole("button", { name: tableCopy.raise })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: tableCopy.callBluffOn("Sly Fox #3C4D") })
    ).toBeInTheDocument();
  });

  it("keeps every seat's dice count from the call until the reveal card closes", () => {
    const before = gameView({ table: playing(), boardRevealed: true, reveal: null, myTurn: false });
    const { rerender } = render(<GameView game={before} />);
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(4) })).toBeInTheDocument();
    const after = {
      ...before,
      seats: before.seats.map((seat) => (seat.isMe ? seat : { ...seat, dice: seat.dice - 1 })),
    };
    rerender(<GameView game={after} />);
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(4) })).toBeInTheDocument();
    rerender(<GameView game={{ ...after, boardRevealed: false }} />);
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(3) })).toBeInTheDocument();
  });

  it("holds the bid control back while the player's dice are still in the cup", () => {
    waitingForDice = true;
    render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.queryByRole("button", { name: tableCopy.raise })).toBeNull();
    expect(
      screen.queryByRole("button", { name: tableCopy.callBluffOn("Sly Fox #3C4D") })
    ).toBeNull();
  });

  it("still lets the player move when their dice couldn't be read", () => {
    waitingForDice = true;
    render(
      <GameView game={gameView({ table: playing(), dice: { status: "failed", retry: vi.fn() } })} />
    );
    expect(screen.getByRole("button", { name: tableCopy.raise })).toBeInTheDocument();
  });

  it("says who everyone is waiting on in one line otherwise", () => {
    render(
      <GameView
        game={gameView({
          table: playing(),
          myTurn: false,
          line: tableCopy.theirTurn("Sly Fox #3C4D"),
        })}
      />
    );
    expect(screen.queryByRole("button", { name: tableCopy.raise })).toBeNull();
    expect(screen.getByRole("status")).toHaveTextContent(tableCopy.theirTurn("Sly Fox #3C4D"));
  });

  it("shows the pot only for a paid table", () => {
    const { unmount } = render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.queryByText(/Pot/)).toBeNull();
    unmount();
    render(<GameView game={gameView({ table: playing(10n * ONE_CHIP), pot: 20n * ONE_CHIP })} />);
    expect(screen.getByText(tableCopy.pot("20"))).toBeInTheDocument();
  });

  it("places every player around the board, with the player's own dice face up", () => {
    render(<GameView game={gameView({ table: playing() })} />);
    expect(
      screen.getByRole("figure", { name: new RegExp(`^${tableCopy.you}`) })
    ).toBeInTheDocument();
    expect(screen.getByRole("figure", { name: /Sly Fox #3C4D/ })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(4) })).toBeInTheDocument();
    expect(screen.getAllByRole("img", { name: "three" })).toHaveLength(2);
  });

  it("opens the reveal card after a call, and closes it on Continue", () => {
    const dismissReveal = vi.fn();
    render(
      <GameView
        game={gameView({
          table: playing(),
          myTurn: false,
          dismissReveal,
          reveal: {
            outcome: "holds",
            quantity: 3,
            face: 4,
            count: 3,
            loserName: "Me #1A2B",
            loserIsMe: true,
            rows: [],
          },
        })}
      />
    );
    expect(screen.getByRole("dialog", { name: tableCopy.bidHolds })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.continueGame }));
    expect(dismissReveal).toHaveBeenCalledOnce();
  });

  it("tags the player's own seat on their turn, with no banner under the board", () => {
    render(<GameView game={gameView({ table: playing(), line: tableCopy.yourTurn })} />);
    expect(screen.getByText(tableCopy.yourTurnTag)).toBeInTheDocument();
    expect(screen.getByRole("status")).toHaveTextContent(tableCopy.yourTurn);
    expect(screen.getByText(tableCopy.yourTurn)).toHaveClass("sr-only");
  });

  it("turns the game clock red in the last minute", () => {
    const { unmount } = render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.getByRole("timer")).toHaveAttribute("data-urgent", "false");
    unmount();
    render(<GameView game={gameView({ table: playing(), clockLeft: 45_000 })} />);
    expect(screen.getByRole("timer", { name: /Game ends in 00:45/ })).toHaveAttribute(
      "data-urgent",
      "true"
    );
  });

  it("warns screen readers when the player's time is nearly up", () => {
    render(<GameView game={gameView({ table: playing(), turnLow: true })} />);
    expect(screen.getByRole("alert")).toHaveTextContent(tableCopy.timeLow);
  });
});
