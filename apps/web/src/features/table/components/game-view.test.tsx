import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { tableCopy } from "../copy";
import { aTable, gameView } from "../lib/game-view.testing";
import { GameView } from "./game-view";

const play = vi.fn();
vi.mock("@/hooks/use-sound", () => ({ useSound: () => ({ play, stop: vi.fn() }) }));
vi.mock("@/hooks/use-theme-colors", () => ({ useThemeColors: () => null }));

let wide = false;
let waitingForDice = false;
vi.mock("../hooks/use-game-board", () => ({
  useGameBoard: () => ({ throwState: { kind: "idle" }, othersShaking: false, waitingForDice }),
}));
const historyWanted: boolean[] = [];
let small = false;
let phone = false;
vi.mock("@/hooks/use-media-query", () => ({
  useMediaQuery: (query: string) =>
    query.includes("40rem") ? phone : query.includes("max-") ? small : wide,
}));
vi.mock("../hooks/use-round-history", () => ({
  useGameHistory: (_table: unknown, enabled: boolean) => {
    historyWanted.push(enabled);
    return { status: "ready", rounds: [{ round: 3, bids: [], end: null }] };
  },
}));

beforeEach(() => {
  wide = false;
  small = false;
  phone = false;
  waitingForDice = false;
  historyWanted.length = 0;
  play.mockClear();
});

const playing = (buyIn = 0n) => aTable({ status: "playing", buyIn, round: 3 });

describe("GameView", () => {
  it("tells a watcher they are watching, with a way back instead of a way to leave", () => {
    render(
      <GameView
        game={gameView({
          table: playing(),
          mySeat: -1,
          watching: true,
          stillIn: false,
          myTurn: false,
          dice: { status: "none" },
          matching: null,
        })}
      />
    );
    expect(screen.getByText(tableCopy.watching)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: tableCopy.backToLobby })).toHaveAttribute(
      "href",
      "/play"
    );
    expect(screen.queryByRole("button", { name: tableCopy.leave })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /bid|bluff/i })).not.toBeInTheDocument();
  });

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

  describe("on a phone", () => {
    function fourPlayers() {
      const base = gameView({ table: aTable({ status: "playing", round: 3, seatCount: 4 }) });
      const [me, fox] = base.seats;
      if (!me || !fox) throw new Error("Expected two seats in the fixture.");
      const other = (player: `0x${string}`, name: string) => ({
        ...fox,
        player,
        name,
        lastBid: null,
      });
      return {
        ...base,
        seats: [
          me,
          fox,
          other("0x0000000000000000000000000000000000005e6f", "Ada #5E6F"),
          other("0x0000000000000000000000000000000000007a8b", "Kola #7A8B"),
        ],
      };
    }

    it("puts every opponent in one row above the board, and the player below it", () => {
      phone = true;
      const { container } = render(<GameView game={fourPlayers()} />);
      const row = container.querySelector("[data-opponents]");
      if (!row) throw new Error("Expected the opponents' row.");
      expect(within(row as HTMLElement).getAllByRole("figure")).toHaveLength(3);
      expect(within(row as HTMLElement).queryByRole("figure", { name: /^You/ })).toBeNull();
      expect(screen.getByRole("figure", { name: /^You/ })).toBeInTheDocument();
    });

    it("keeps the seats around the board on wider screens", () => {
      const { container } = render(<GameView game={fourPlayers()} />);
      expect(container.querySelector("[data-opponents]")).toBeNull();
    });

    it("opens the rounds so far from the round badge, reading them only then", async () => {
      phone = true;
      render(<GameView game={gameView({ table: playing() })} />);
      expect(historyWanted.some(Boolean)).toBe(false);
      fireEvent.click(screen.getByRole("button", { name: tableCopy.openHistory(3, 8) }));
      expect(await screen.findByRole("dialog", { name: tableCopy.history })).toBeInTheDocument();
      expect(historyWanted.at(-1)).toBe(true);
    });

    it("leaves the bid beside the bidder, so the top strip fits", () => {
      phone = true;
      render(<GameView game={gameView({ table: playing() })} />);
      const pill = screen.getByText(tableCopy.currentBidIs).closest("[data-strip-bid]");
      expect(pill).toHaveClass("max-[40rem]:hidden");
    });
  });

  it("shows the round, the dice in play and the game clock in one slim strip", () => {
    wide = true;
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

  it("keeps the dice count until the reveal card has fully left the screen", async () => {
    const card = {
      outcome: "holds" as const,
      quantity: 2,
      face: 4 as const,
      count: 3,
      loserName: "Sly Fox #3C4D",
      loserIsMe: false,
      rows: [],
    };
    const open = gameView({ table: playing(), boardRevealed: true, reveal: card, myTurn: false });
    const { rerender } = render(<GameView game={open} />);
    const closing = {
      ...open,
      boardRevealed: false,
      reveal: null,
      seats: open.seats.map((seat) => (seat.isMe ? seat : { ...seat, dice: seat.dice - 1 })),
    };
    rerender(<GameView game={closing} />);
    expect(screen.getByRole("img", { name: tableCopy.hiddenDice(4) })).toBeInTheDocument();
    await waitFor(() =>
      expect(screen.getByRole("img", { name: tableCopy.hiddenDice(3) })).toBeInTheDocument()
    );
  });

  it("holds the bid control back while the player's dice are still in the cup", () => {
    waitingForDice = true;
    render(<GameView game={gameView({ table: playing() })} />);
    expect(screen.queryByRole("button", { name: tableCopy.raise })).toBeNull();
    expect(
      screen.queryByRole("button", { name: tableCopy.callBluffOn("Sly Fox #3C4D") })
    ).toBeNull();
  });

  it("lets the player move while their dice are still locked", () => {
    waitingForDice = true;
    render(
      <GameView
        game={gameView({
          table: playing(),
          dice: { status: "locked", unlock: vi.fn(), unlocking: false },
        })}
      />
    );
    expect(screen.getByRole("button", { name: tableCopy.raise })).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: tableCopy.callBluffOn("Sly Fox #3C4D") })
    ).toBeInTheDocument();
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

  it("ticks once a second through the player's last ten seconds", () => {
    const view = (turnLeft: number) => (
      <GameView game={gameView({ table: playing(), turnLeft, turnLow: turnLeft <= 10_000 })} />
    );
    const { rerender } = render(view(12_000));
    expect(play).not.toHaveBeenCalledWith("tick");
    rerender(view(9_800));
    rerender(view(9_400));
    rerender(view(8_900));
    expect(play.mock.calls.filter(([name]) => name === "tick")).toHaveLength(2);
  });

  it("never ticks on someone else's turn", () => {
    render(
      <GameView
        game={gameView({ table: playing(), myTurn: false, turnLeft: 5_000, turnLow: true })}
      />
    );
    expect(play).not.toHaveBeenCalledWith("tick");
  });

  it("asks before leaving a game, and only leaves when the player confirms", async () => {
    const leave = vi.fn();
    render(<GameView game={gameView({ table: playing(), leave })} />);
    fireEvent.click(screen.getByRole("button", { name: tableCopy.leave }));
    expect(
      await screen.findByRole("dialog", { name: tableCopy.leaveConfirmTitle })
    ).toBeInTheDocument();
    expect(leave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.stay }));
    expect(leave).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: tableCopy.leave }));
    fireEvent.click(await screen.findByRole("button", { name: tableCopy.leaveConfirm }));
    expect(leave).toHaveBeenCalledOnce();
  });
  describe("keyboard focus", () => {
    const card = {
      outcome: "holds" as const,
      quantity: 2,
      face: 4 as const,
      count: 3,
      loserName: "Sly Fox #3C4D",
      loserIsMe: false,
      rows: [],
    };

    it("moves to Raise when the player's turn comes round", () => {
      const theirs = gameView({ table: playing(), myTurn: false });
      const { rerender } = render(<GameView game={theirs} />);
      expect(document.activeElement).toBe(document.body);
      rerender(<GameView game={{ ...theirs, myTurn: true }} />);
      expect(document.activeElement).toBe(screen.getByRole("button", { name: tableCopy.raise }));
    });

    it("leaves focus alone when the player is busy somewhere else on their turn", () => {
      const theirs = gameView({ table: playing(), myTurn: false });
      const { rerender } = render(<GameView game={theirs} />);
      const leave = screen.getByRole("button", { name: tableCopy.leave });
      leave.focus();
      rerender(<GameView game={{ ...theirs, myTurn: true }} />);
      expect(document.activeElement).toBe(leave);
    });

    it("waits for the reveal card instead of pulling focus out of it", () => {
      const open = gameView({ table: playing(), myTurn: false, reveal: card });
      const { rerender } = render(<GameView game={open} />);
      const inside = screen.getByRole("dialog", { name: tableCopy.bidHolds });
      expect(inside).toContainElement(document.activeElement as HTMLElement);
      rerender(<GameView game={{ ...open, myTurn: true }} />);
      expect(inside).toContainElement(document.activeElement as HTMLElement);
    });

    it("goes to Raise when the reveal card closes on the player's turn", async () => {
      const open = gameView({ table: playing(), myTurn: true, reveal: card });
      const { rerender } = render(<GameView game={open} />);
      rerender(<GameView game={{ ...open, reveal: null }} />);
      await waitFor(() =>
        expect(document.activeElement).toBe(screen.getByRole("button", { name: tableCopy.raise }))
      );
    });

    it("goes to the table heading when the reveal card closes on someone else's turn", async () => {
      const open = gameView({ table: playing(), myTurn: false, reveal: card });
      const { rerender } = render(<GameView game={open} />);
      rerender(<GameView game={{ ...open, reveal: null }} />);
      await waitFor(() =>
        expect(document.activeElement).toBe(
          screen.getByRole("heading", { name: tableCopy.tableName("12") })
        )
      );
    });
  });
  describe("on a small phone", () => {
    it("keeps the usual bid control on a roomy screen", () => {
      render(<GameView game={gameView({ table: playing() })} />);
      expect(screen.getByRole("button", { name: tableCopy.oneMore })).toHaveClass("size-9");
      expect(screen.getByRole("button", { name: tableCopy.raise })).toHaveClass("min-h-12");
    });

    it("gives the stepper finger-sized buttons and slims the bid control down", () => {
      small = true;
      render(<GameView game={gameView({ table: playing() })} />);
      expect(screen.getByRole("button", { name: tableCopy.oneFewer })).toHaveClass("size-11");
      expect(screen.getByRole("button", { name: tableCopy.oneMore })).toHaveClass("size-11");
      expect(screen.getByRole("button", { name: tableCopy.raise })).toHaveClass("min-h-10");
      expect(
        screen.getByRole("button", { name: tableCopy.callBluffOn("Sly Fox #3C4D") })
      ).toHaveClass("min-h-10");
    });

    it("puts the faces on their own row, then the stepper beside Raise", () => {
      small = true;
      render(<GameView game={gameView({ table: playing() })} />);
      const faces = screen.getByRole("group", { name: tableCopy.yourBid });
      const stepper = screen.getByRole("button", { name: tableCopy.oneMore });
      const raise = screen.getByRole("button", { name: tableCopy.raise });
      expect(
        faces.compareDocumentPosition(stepper) & Node.DOCUMENT_POSITION_FOLLOWING
      ).toBeTruthy();
      const raiseRow = raise.parentElement;
      expect(raiseRow).toContainElement(stepper);
      expect(raiseRow).not.toContainElement(faces);
    });
  });
});
