import { describe, expect, it } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import type { Table } from "@bluff/game";
import { blockSpans, gameOutcome, historyGames, mergeGames } from "./game-log";

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const KOLA = "0x0000000000000000000000000000000000005e6f";

function finished(buyIn = 0n, overrides: Partial<Table> = {}): Table {
  return {
    id: 12n,
    host: ME,
    status: "finished",
    isPrivate: false,
    seatCount: 3,
    buyIn,
    deadline: 0,
    ...NO_GAME,
    seats: [ME, ADA, KOLA].map((player) => ({
      player: player as `0x${string}`,
      ready: true,
      isHost: player === ME,
      isActive: true,
      ...NO_DICE,
    })),
    ...overrides,
  };
}

describe("blockSpans", () => {
  it("splits a search into spans no wider than asked, covering every block once", () => {
    expect(blockSpans(100n, 250n, 100n)).toEqual([
      [100n, 199n],
      [200n, 250n],
    ]);
    expect(blockSpans(100n, 100n, 100n)).toEqual([[100n, 100n]]);
    expect(blockSpans(101n, 100n, 100n)).toEqual([]);
  });
});

describe("mergeGames", () => {
  it("adds newly found games to the remembered ones, newest first, without repeats", () => {
    expect(
      mergeGames(
        [
          { id: 7n, block: 50n },
          { id: 3n, block: 10n },
        ],
        [
          { id: 9n, block: 80n },
          { id: 7n, block: 50n },
        ]
      )
    ).toEqual([
      { id: 9n, block: 80n },
      { id: 7n, block: 50n },
      { id: 3n, block: 10n },
    ]);
  });
});

describe("gameOutcome", () => {
  it("is a win, with the pot less the buy-in, for the only winner of a paid game", () => {
    expect(
      gameOutcome({
        table: finished(10n * ONE_CHIP),
        ending: { reason: "last-standing", winners: [ME] },
        me: ME,
        left: false,
      })
    ).toEqual({ result: "won", winners: [ME], chips: 20n * ONE_CHIP });
  });

  it("is a shared win when the clock runs out with players level", () => {
    expect(
      gameOutcome({
        table: finished(10n * ONE_CHIP),
        ending: { reason: "clock", winners: [ADA, ME] },
        me: ME,
        left: false,
      })
    ).toMatchObject({ result: "shared", chips: 5n * ONE_CHIP });
  });

  it("is a loss of the buy-in for a player who didn't win", () => {
    expect(
      gameOutcome({
        table: finished(10n * ONE_CHIP),
        ending: { reason: "last-standing", winners: [ADA] },
        me: ME,
        left: false,
      })
    ).toEqual({ result: "lost", winners: [ADA], chips: -10n * ONE_CHIP });
  });

  it("says the player left early when they did", () => {
    expect(
      gameOutcome({
        table: finished(),
        ending: { reason: "others-left", winners: [ADA] },
        me: ME,
        left: true,
      })
    ).toEqual({ result: "left", winners: [ADA], chips: null });
  });

  it("names no chips on a free table", () => {
    expect(
      gameOutcome({
        table: finished(),
        ending: { reason: "last-standing", winners: [ME] },
        me: ME,
        left: false,
      }).chips
    ).toBeNull();
  });

  it("says a stuck game was stopped and refunded, with no chips won or lost", () => {
    expect(
      gameOutcome({
        table: finished(10n * ONE_CHIP),
        ending: { reason: "stuck", winners: [ME, ADA, KOLA] },
        me: ME,
        left: false,
      })
    ).toEqual({ result: "stopped", winners: [], chips: 0n });
  });

  it("says a game is still going", () => {
    expect(
      gameOutcome({ table: finished(0n, { status: "playing" }), ending: null, me: ME, left: false })
    ).toEqual({ result: "playing", winners: [], chips: null });
  });

  it("says a finished game's result couldn't be found rather than guessing", () => {
    expect(gameOutcome({ table: finished(), ending: null, me: ME, left: false })).toEqual({
      result: "unknown",
      winners: [],
      chips: null,
    });
  });
});

describe("historyGames", () => {
  const joined = [
    { id: 12n, block: 300n },
    { id: 11n, block: 200n },
    { id: 10n, block: 100n },
  ];

  it("keeps only started tables you still have a seat at, and marks the ones you left", () => {
    const games = historyGames({
      tables: [
        finished(),
        finished(0n, { id: 11n, status: "cancelled" }),
        finished(0n, { id: 10n, seats: [] }),
      ],
      joins: joined,
      lefts: [{ id: 12n, block: 350n }],
      endings: new Map([[12n, { reason: "others-left" as const, winners: [ADA] }]]),
      me: ME,
    });
    expect(games.map((game) => [game.table.id, game.outcome.result, game.reason])).toEqual([
      [12n, "left", "others-left"],
    ]);
  });

  it("doesn't count leaving the waiting room before you sat down again", () => {
    const games = historyGames({
      tables: [finished()],
      joins: [{ id: 12n, block: 300n }],
      lefts: [{ id: 12n, block: 250n }],
      endings: new Map([[12n, { reason: "last-standing" as const, winners: [ME] }]]),
      me: ME,
    });
    expect(games[0]?.outcome.result).toBe("won");
  });
});
