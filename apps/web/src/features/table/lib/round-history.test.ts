import { describe, expect, it } from "vitest";
import { type HistoryEvent, roundHistory, withCurrentBid } from "./round-history";

const ADA = "0x0000000000000000000000000000000000003c4d";
const KOLA = "0x0000000000000000000000000000000000005e6f";

const started = (round: number): HistoryEvent => ({ eventName: "RoundStarted", args: { round } });
const bid = (round: number, player: string, quantity: number, face: number): HistoryEvent => ({
  eventName: "BidPlaced",
  args: { round, player, quantity, face },
});

describe("roundHistory", () => {
  it("lists each round's bids in order, and how the round ended", () => {
    expect(
      roundHistory([
        started(1),
        bid(1, ADA, 2, 4),
        bid(1, KOLA, 3, 4),
        {
          eventName: "RoundSettled",
          args: { round: 1, face: 4, quantity: 3, count: 1, loser: KOLA },
        },
        started(2),
        bid(2, KOLA, 1, 6),
      ])
    ).toEqual([
      {
        round: 2,
        bids: [{ player: KOLA, quantity: 1, face: 6 }],
        end: null,
      },
      {
        round: 1,
        bids: [
          { player: ADA, quantity: 2, face: 4 },
          { player: KOLA, quantity: 3, face: 4 },
        ],
        end: { kind: "called", holds: false, loser: KOLA },
      },
    ]);
  });

  it("says when a bid held", () => {
    const [round] = roundHistory([
      started(1),
      bid(1, ADA, 2, 4),
      {
        eventName: "RoundSettled",
        args: { round: 1, face: 4, quantity: 2, count: 3, loser: KOLA },
      },
    ]);
    expect(round?.end).toEqual({ kind: "called", holds: true, loser: KOLA });
  });

  it("ends a round on a timeout, which names no round itself", () => {
    const [round] = roundHistory([
      started(1),
      bid(1, ADA, 2, 4),
      { eventName: "TurnTimedOut", args: { player: KOLA } },
      started(2),
    ]);
    expect(round).toEqual({ round: 2, bids: [], end: null });
    expect(
      roundHistory([started(1), { eventName: "TurnTimedOut", args: { player: KOLA } }])[0]?.end
    ).toEqual({
      kind: "timeout",
      player: KOLA,
    });
  });

  it("ignores events it can't read, and bids for another round", () => {
    expect(
      roundHistory([
        started(1),
        { eventName: "BidPlaced", args: { round: 1 } },
        bid(2, ADA, 1, 3),
        { eventName: "Something", args: {} },
      ])
    ).toEqual([{ round: 1, bids: [], end: null }]);
  });

  it("shows only the game being played when the table is played again", () => {
    const rounds = roundHistory([
      { eventName: "GameStarted", args: {} },
      started(1),
      bid(1, ADA, 2, 4),
      { eventName: "RoundSettled", args: { round: 1, face: 4, quantity: 2, count: 0, loser: ADA } },
      started(2),
      { eventName: "GameStarted", args: {} },
      started(1),
      bid(1, KOLA, 1, 3),
    ]);
    expect(rounds).toEqual([
      { round: 1, bids: [{ player: KOLA, quantity: 1, face: 3 }], end: null },
    ]);
    expect(new Set(rounds.map((round) => round.round)).size).toBe(rounds.length);
  });

  it("has nothing before the first round starts", () => {
    expect(roundHistory([])).toEqual([]);
  });
});

describe("withCurrentBid", () => {
  const read = [{ round: 2, bids: [{ player: ADA, quantity: 2, face: 4 }], end: null }];

  it("adds the table's bid when the history hasn't caught up with it yet", () => {
    expect(withCurrentBid(read, 2, { player: KOLA, quantity: 3, face: 4 })[0]?.bids).toEqual([
      { player: ADA, quantity: 2, face: 4 },
      { player: KOLA, quantity: 3, face: 4 },
    ]);
  });

  it("doesn't list a bid twice once the history has it", () => {
    expect(withCurrentBid(read, 2, { player: ADA, quantity: 2, face: 4 })).toEqual(read);
  });

  it("starts the round when the history hasn't seen it begin", () => {
    expect(withCurrentBid([], 1, { player: ADA, quantity: 1, face: 5 })).toEqual([
      { round: 1, bids: [{ player: ADA, quantity: 1, face: 5 }], end: null },
    ]);
  });

  it("starts an empty round when the history is a round behind", () => {
    expect(withCurrentBid(read, 3, null)[0]).toEqual({ round: 3, bids: [], end: null });
  });

  it("changes nothing when there's no bid and the round is known", () => {
    expect(withCurrentBid(read, 2, null)).toEqual(read);
  });
});
