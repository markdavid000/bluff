import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { type Notice, onNotice } from "@/lib/notify";
import { settingsStore } from "@/lib/settings-store";
import { tableCopy } from "../copy";
import { NO_GAME } from "../lib/table-fixture.testing";
import type { GameEnding } from "../lib/game-end";
import type { Table } from "../lib/table-view";
import type { PlacedBid, RoundResult } from "./use-table-events";
import { useGame } from "./use-game";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x0000000000000000000000000000000000001a2b";
const FOX = "0x0000000000000000000000000000000000003c4d";
const NOW = 1_700_000_000_000;

let tableRead: Record<string, unknown> = {};
let dice: Record<string, unknown> = { status: "ready", faces: [5, 1, 3, 3] };
let end: Record<string, unknown> = { status: "loading" };
let settle: (result: RoundResult) => void = () => undefined;
let gameEnded: (ending: GameEnding) => void = () => undefined;
let placed: (bid: PlacedBid) => void = () => undefined;
const sendMove = vi.fn();
const replace = vi.fn();
const router = { replace };

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ME } } }),
}));
vi.mock("next/navigation", () => ({ useRouter: () => router }));
const invalidateBalanceQueries = vi.fn();
vi.mock("@zama-fhe/sdk/query", () => ({
  invalidateBalanceQueries: (...args: unknown[]) => invalidateBalanceQueries(...args),
}));
vi.mock("@/hooks/use-block-clock", () => ({ useFollowChain: vi.fn(), useBlockClock: () => 100n }));
vi.mock("@/hooks/use-player-profiles", () => ({
  usePlayerProfiles: () => ({
    status: "ready",
    profileOf: (address: string) => ({
      name: address === FOX ? "Sly Fox #3C4D" : "Me #1A2B",
      avatarSrc: "/a.svg",
    }),
  }),
}));
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));
vi.mock("./use-table", () => ({ useTable: () => tableRead }));
vi.mock("./use-table-events", () => ({
  useTableEvents: ({
    onRoundSettled,
    onBidPlaced,
    onGameEnded,
  }: {
    onRoundSettled: (result: RoundResult) => void;
    onBidPlaced: (bid: PlacedBid) => void;
    onGameEnded: (ending: GameEnding) => void;
  }) => {
    settle = onRoundSettled;
    gameEnded = onGameEnded;
    placed = onBidPlaced;
  },
}));
vi.mock("./use-table-keeper", () => ({ useTableKeeper: vi.fn() }));
vi.mock("./use-own-dice", () => ({ useOwnDice: () => dice }));
vi.mock("./use-game-end", () => ({ useGameEnd: () => end }));
let caughtUp: RoundResult | null = null;
const catchUpAsked: Record<string, unknown>[] = [];
vi.mock("./use-round-result-catch-up", () => ({
  useRoundResultCatchUp: (request: Record<string, unknown>) => {
    catchUpAsked.push(request);
    return caughtUp;
  },
}));

function game(overrides: Partial<Table> = {}): Table {
  return {
    id: 12n,
    host: ME,
    status: "playing",
    isPrivate: false,
    seatCount: 2,
    buyIn: 0n,
    deadline: NOW + 75_000,
    ...NO_GAME,
    diceInPlay: 8,
    startedAt: NOW - 60_000,
    round: 1,
    seats: [
      { player: ME, ready: false, isHost: true, isActive: true, dice: 4, missedTurns: 0 },
      { player: FOX, ready: true, isHost: false, isActive: true, dice: 4, missedTurns: 0 },
    ],
    ...overrides,
  };
}

function show(table: Table, readAt: bigint | null = 100n) {
  tableRead = { status: "ready", table, readAt };
}

function render() {
  const queryClient = new QueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return renderHook(() => useGame(12n), { wrapper: Wrapper });
}

function viewOf(result: { current: ReturnType<typeof useGame> }) {
  const view = result.current.view;
  if (!view) throw new Error("Expected the game.");
  return view;
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  show(game());
  dice = { status: "ready", faces: [5, 1, 3, 3] };
  end = { status: "loading" };
  sendMove.mockResolvedValue({ blockNumber: 101n });
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("useGame", () => {
  it("has no game to show until the table is read", () => {
    tableRead = { status: "loading" };
    expect(render().result.current.view).toBeNull();
  });

  it("asks the starter for the first bid, starting from their strongest face", () => {
    const view = viewOf(render().result);
    expect(view.myTurn).toBe(true);
    expect(view.line).toBe(tableCopy.youStart);
    expect(view.choice.choice).toEqual({ quantity: 3, face: 3 });
  });

  it("names who is thinking on someone else's turn, and offers no bids", () => {
    show(game({ turn: 1 }));
    const view = viewOf(render().result);
    expect(view.myTurn).toBe(false);
    expect(view.line).toBe(tableCopy.theirTurn("Sly Fox #3C4D"));
    expect(view.seats[1]?.isTurn).toBe(true);
  });

  it("shows the bid at once while it lands, and hands the turn on", async () => {
    let land: (receipt: { blockNumber: bigint }) => void = () => undefined;
    sendMove.mockImplementation(
      () =>
        new Promise((resolve) => {
          land = resolve;
        })
    );
    const { result } = render();
    act(() => viewOf(result).placeBid({ quantity: 3, face: 4 }));
    expect(viewOf(result).bid).toEqual({ quantity: 3, face: 4 });
    expect(viewOf(result).myTurn).toBe(false);
    expect(viewOf(result).seats[0]?.isTurn).toBe(false);
    expect(viewOf(result).line).toBe(tableCopy.placingBid);
    expect(sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ functionName: "placeBid", args: [12n, 3, 4] }),
      expect.any(Function)
    );
    await act(async () => land({ blockNumber: 101n }));
    expect(viewOf(result).bid).toEqual({ quantity: 3, face: 4 });
  });

  it("never brings an old bid back once the table has caught up", async () => {
    const { result, rerender } = render();
    await act(async () => viewOf(result).placeBid({ quantity: 3, face: 4 }));
    show(game({ turn: 1, bid: { quantity: 3, face: 4, bidder: 0 } }), 101n);
    rerender();
    expect(viewOf(result).bid).toEqual({ quantity: 3, face: 4, bidder: 0 });
    show(game({ round: 2, turn: 0 }), 102n);
    rerender();
    show(game({ round: 2, turn: 0 }), null);
    rerender();
    expect(viewOf(result).bid).toBeNull();
    expect(viewOf(result).myTurn).toBe(true);
  });

  it("keeps the cups up from the call until the reveal card closes", () => {
    show(game({ status: "revealing", bid: { quantity: 3, face: 4, bidder: 1 }, caller: 0 }));
    const { result, rerender } = render();
    expect(viewOf(result).boardRevealed).toBe(true);
    show(game({ round: 2 }));
    rerender();
    expect(viewOf(result).boardRevealed).toBe(true);
    expect(viewOf(result).boardRound).toBe(1);
    act(() => settle({ round: 1, face: 4, quantity: 3, count: 3, loser: ME, faces: [4, 4, 1, 6] }));
    expect(viewOf(result).boardRevealed).toBe(true);
    act(() => viewOf(result).dismissReveal());
    expect(viewOf(result).boardRevealed).toBe(false);
    expect(viewOf(result).boardRound).toBe(2);
  });

  it("holds the next turn's controls, tag and tips until the reveal card closes", () => {
    show(game({ status: "revealing", bid: { quantity: 3, face: 4, bidder: 1 }, caller: 0 }));
    const { result, rerender } = render();
    show(game({ round: 2, turn: 0 }));
    rerender();
    expect(viewOf(result).myTurn).toBe(false);
    expect(viewOf(result).seats[0]?.isTurn).toBe(false);
    act(() => settle({ round: 1, face: 4, quantity: 3, count: 3, loser: ME, faces: [4, 4, 1, 6] }));
    expect(viewOf(result).myTurn).toBe(false);
    act(() => viewOf(result).dismissReveal());
    expect(viewOf(result).myTurn).toBe(true);
    expect(viewOf(result).seats[0]?.isTurn).toBe(true);
  });

  it("shows the reveal from the chain itself when the live update never comes", () => {
    show(game({ status: "revealing", bid: { quantity: 3, face: 4, bidder: 1 }, caller: 0 }));
    const { result, rerender } = render();
    expect(catchUpAsked.at(-1)).toMatchObject({ round: 1, fromBlock: 100n, wanted: true });
    show(game({ round: 2 }));
    rerender();
    caughtUp = { round: 1, face: 4, quantity: 3, count: 2, loser: FOX, faces: [4, 4, 1, 6] };
    rerender();
    expect(viewOf(result).reveal).toMatchObject({ outcome: "caught", loserName: "Sly Fox #3C4D" });
    caughtUp = null;
  });

  it("stops waiting for a reveal that never arrives", () => {
    show(game({ status: "revealing", bid: { quantity: 3, face: 4, bidder: 1 }, caller: 0 }));
    const { result, rerender } = render();
    show(game({ round: 2 }));
    rerender();
    expect(viewOf(result).boardRevealed).toBe(true);
    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    expect(viewOf(result).boardRevealed).toBe(false);
    expect(viewOf(result).boardRound).toBe(2);
  });

  it("puts the bid back when it fails", async () => {
    vi.useRealTimers();
    sendMove.mockRejectedValue(new Error("refused"));
    const { result } = render();
    act(() => viewOf(result).placeBid({ quantity: 3, face: 4 }));
    await waitFor(() => expect(viewOf(result).placing).toBe(false));
    expect(viewOf(result).bid).toBeNull();
    expect(viewOf(result).myTurn).toBe(true);
  });

  it("calls the bluff on the player who made the last bid", async () => {
    vi.useRealTimers();
    show(game({ bid: { quantity: 3, face: 4, bidder: 1 } }));
    const { result } = render();
    expect(viewOf(result).bidderName).toBe("Sly Fox #3C4D");
    act(() => viewOf(result).callBluff());
    await waitFor(() =>
      expect(sendMove).toHaveBeenCalledWith(
        expect.objectContaining({ functionName: "callBluff", args: [12n] }),
        expect.any(Function)
      )
    );
  });

  it("shows 60 seconds for a turn while the contract allows 75, and warns at ten", () => {
    expect(viewOf(render().result).turnLeft).toBe(60_000);
    expect(viewOf(render().result).turnFraction).toBe(1);
    show(game({ deadline: NOW + 45_000 }));
    expect(viewOf(render().result).turnFraction).toBe(0.5);
    show(game({ deadline: NOW + 24_000 }));
    const view = viewOf(render().result);
    expect(view.turnLeft).toBe(9_000);
    expect(view.turnLow).toBe(true);
  });

  it("counts down the 15-minute game clock from the first roll", () => {
    expect(viewOf(render().result).clockLeft).toBe(14 * 60 * 1000);
  });

  it("lights up the player's dice that count for the chosen bid", () => {
    expect(viewOf(render().result).matching).toEqual([false, true, true, true]);
  });

  it("coaches the player with a tip only on their own turn", async () => {
    vi.useRealTimers();
    settingsStore().update({ seenTips: ["wild-ones", "at-least", "how-to-raise", "call-bluff"] });
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    render();
    await waitFor(() =>
      expect(shown.map((notice) => notice.title)).toContain(tableCopy.coachTip.safe("3 × three"))
    );
    stop();
    settingsStore().update({ seenTips: [] });
  });

  it("teaches a new player that ones are wild before any bid advice", async () => {
    vi.useRealTimers();
    settingsStore().update({ seenTips: [] });
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    render();
    await waitFor(() =>
      expect(shown.map((notice) => notice.title)).toEqual([tableCopy.firstTips["wild-ones"]])
    );
    stop();
    settingsStore().update({ seenTips: [] });
  });

  it("gives no tip on someone else's turn", async () => {
    vi.useRealTimers();
    show(game({ turn: 1 }));
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    render();
    await new Promise((resolve) => setTimeout(resolve, 800));
    expect(shown.map((notice) => notice.icon)).not.toContain("target");
    stop();
  });

  it("shows each player's last bid this round, and clears them for the next round", () => {
    const { result, rerender } = render();
    act(() => placed({ round: 1, player: FOX, quantity: 3, face: 4 }));
    expect(viewOf(result).seats[1]?.lastBid).toEqual({ quantity: 3, face: 4 });
    show(game({ round: 2 }));
    rerender();
    expect(viewOf(result).seats[1]?.lastBid).toBeNull();
  });

  it("opens the reveal card after a call, then closes it after 6 seconds", () => {
    const { result } = render();
    act(() =>
      settle({ round: 1, face: 4, quantity: 3, count: 2, loser: FOX, faces: [4, 4, 2, 6] })
    );
    expect(viewOf(result).reveal).toMatchObject({
      outcome: "caught",
      count: 2,
      loserName: "Sly Fox #3C4D",
      loserIsMe: false,
    });
    act(() => {
      vi.advanceTimersByTime(7_000);
    });
    expect(viewOf(result).reveal).toBeNull();
  });

  it("shows the last reveal before the results, with no flash between them", () => {
    const { result, rerender } = render();
    show(game({ status: "finished" }));
    rerender();
    act(() =>
      settle({ round: 1, face: 4, quantity: 3, count: 3, loser: FOX, faces: [4, 4, 1, 6] })
    );
    expect(viewOf(result).reveal).toMatchObject({ outcome: "holds" });
    expect(viewOf(result).showResults).toBe(false);
    act(() => viewOf(result).dismissReveal());
    expect(viewOf(result).showResults).toBe(true);
  });

  it("waits a moment for the last reveal, then shows the results anyway", () => {
    const { result, rerender } = render();
    show(game({ status: "finished" }));
    rerender();
    expect(viewOf(result).showResults).toBe(false);
    act(() => {
      vi.advanceTimersByTime(4_000);
    });
    expect(viewOf(result).showResults).toBe(true);
  });

  it("opens the results at once for a game that was already over", () => {
    show(game({ status: "finished" }));
    expect(viewOf(render().result).showResults).toBe(true);
  });

  it("refreshes the player's chips the moment a paid game pays out", () => {
    show(game({ buyIn: 10n * ONE_CHIP }));
    render();
    act(() => gameEnded({ reason: "last-standing", winners: [ME] }));
    expect(invalidateBalanceQueries).toHaveBeenCalledOnce();
  });

  it("leaves the chips alone when a free game ends", () => {
    render();
    act(() => gameEnded({ reason: "last-standing", winners: [ME] }));
    expect(invalidateBalanceQueries).not.toHaveBeenCalled();
  });

  it("says You for the player among the winners", () => {
    show(game({ status: "finished" }));
    end = { status: "ready", reason: "last-standing", winners: [ME] };
    const view = viewOf(render().result);
    expect(view.iWon).toBe(true);
    expect(view.winnerNames).toEqual([tableCopy.you]);
  });

  it("tells the bidder who called their bluff while the dice are revealed", () => {
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    show(game({ status: "revealing", bid: { quantity: 3, face: 4, bidder: 0 }, caller: 1 }));
    render();
    stop();
    expect(shown.map((notice) => notice.title)).toContain(
      tableCopy.calledYourBluff("Sly Fox #3C4D")
    );
  });

  it("reminds the caller whose bluff they called while the dice are revealed", () => {
    const shown: Notice[] = [];
    const stop = onNotice((event) => {
      if (event.type === "show") shown.push(event.notice);
    });
    show(game({ status: "revealing", bid: { quantity: 3, face: 4, bidder: 1 }, caller: 0 }));
    render();
    stop();
    expect(shown.map((notice) => notice.title)).toContain(
      tableCopy.youCalledBluff("Sly Fox #3C4D")
    );
  });

  it("closes the reveal card when the player presses Continue", () => {
    const { result } = render();
    act(() => settle({ round: 1, face: 4, quantity: 3, count: 3, loser: ME, faces: [4, 4, 1, 6] }));
    expect(viewOf(result).reveal).toMatchObject({ outcome: "holds", loserIsMe: true });
    act(() => viewOf(result).dismissReveal());
    expect(viewOf(result).reveal).toBeNull();
  });

  it("lays each player's revealed dice on their side, marking the ones that count", () => {
    show(game({ status: "revealing", bid: { quantity: 3, face: 4, bidder: 1 } }));
    const { result, rerender } = render();
    show(game({ round: 2 }));
    rerender();
    act(() =>
      settle({
        round: 1,
        face: 4,
        quantity: 3,
        count: 3,
        loser: ME,
        faces: [4, 1, 2, 6, 4, 3, 3, 5],
      })
    );
    expect(viewOf(result).revealedDice).toEqual([
      { faces: [4, 1, 2, 6], counting: [true, true, false, false] },
      { faces: [4, 3, 3, 5], counting: [true, false, false, false] },
    ]);
    expect(viewOf(result).reveal?.rows).toEqual([
      {
        name: "Me #1A2B",
        isMe: true,
        faces: [4, 1, 2, 6],
        counting: [true, true, false, false],
        matches: 2,
        role: null,
      },
      {
        name: "Sly Fox #3C4D",
        isMe: false,
        faces: [4, 3, 3, 5],
        counting: [true, false, false, false],
        matches: 1,
        role: "bidder",
      },
    ]);
  });

  it("tells a player who is out that they can watch, and reads no dice for them", () => {
    show(
      game({
        turn: 1,
        seats: [
          { player: ME, ready: false, isHost: true, isActive: false, dice: 0, missedTurns: 0 },
          { player: FOX, ready: true, isHost: false, isActive: true, dice: 4, missedTurns: 0 },
        ],
      })
    );
    const view = viewOf(render().result);
    expect(view.stillIn).toBe(false);
    expect(view.line).toBe(tableCopy.outWatching);
  });

  it("names the winners and the player's share of the pot at the end", () => {
    show(game({ status: "finished", buyIn: 10n * ONE_CHIP }));
    end = { status: "ready", reason: "last-standing", winners: [ME] };
    const view = viewOf(render().result);
    expect(view.pot).toBe(20n * ONE_CHIP);
    expect(view.myShare).toBe(20n * ONE_CHIP);
    expect(view.winnerNames).toEqual([tableCopy.you]);
  });

  it("takes the player back to the lobby after leaving", async () => {
    vi.useRealTimers();
    const { result } = render();
    act(() => viewOf(result).leave());
    await waitFor(() => expect(replace).toHaveBeenCalledWith("/play"));
  });
});
