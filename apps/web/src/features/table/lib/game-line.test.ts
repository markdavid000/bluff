import { describe, expect, it } from "vitest";
import { tableCopy } from "../copy";
import { gameLine } from "./game-line";
import type { Table } from "@bluff/game";

const name = (seat: number) => ["You", "Sly Fox", "Ada"][seat] ?? "Player";

function game(overrides: Partial<Table>): Pick<Table, "status" | "turn" | "bid" | "diceInPlay"> {
  return { status: "playing", turn: 0, bid: null, diceInPlay: 8, ...overrides };
}

describe("gameLine", () => {
  it("tells the starter to make the first bid", () => {
    expect(gameLine(game({}), 0, true, name)).toBe(tableCopy.youStart);
  });

  it("tells the player it's their turn to raise or call", () => {
    expect(gameLine(game({ bid: { quantity: 3, face: 4, bidder: 1 } }), 0, true, name)).toBe(
      tableCopy.yourTurn
    );
  });

  it("tells the player only a call is left at the top bid", () => {
    expect(gameLine(game({ bid: { quantity: 8, face: 6, bidder: 1 } }), 0, true, name)).toBe(
      tableCopy.topBid
    );
  });

  it("names who everyone is waiting on", () => {
    expect(gameLine(game({ turn: 1 }), 0, true, name)).toBe(tableCopy.theirTurn("Sly Fox"));
  });

  it("says the dice are being revealed", () => {
    expect(gameLine(game({ status: "revealing" }), 0, true, name)).toBe(tableCopy.revealing);
  });

  it("tells a player who is out that they can watch the rest", () => {
    expect(gameLine(game({ turn: 1 }), 0, false, name)).toBe(tableCopy.outWatching);
  });

  it("says the game is over", () => {
    expect(gameLine(game({ status: "finished" }), 0, true, name)).toBe(tableCopy.gameOver);
  });
});
