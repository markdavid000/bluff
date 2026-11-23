import { NO_DICE, NO_GAME } from "@bluff/game/testing";
import type { Table } from "@bluff/game";
import { describe, expect, it } from "vitest";
import { COMPUTER_PLAYERS } from "@/config/computer-players";
import { liveGames } from "./live-games";

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const KOLA = "0x0000000000000000000000000000000000005e6f";
const BABA = COMPUTER_PLAYERS[0] ?? KOLA;

function table(id: bigint, change: Partial<Table> = {}, players: string[] = [ADA, KOLA]): Table {
  return {
    id,
    host: ADA,
    status: "playing",
    isPrivate: false,
    seatCount: 2,
    buyIn: 0n,
    deadline: 0,
    ...NO_GAME,
    round: 2,
    diceInPlay: 7,
    seats: players.map((player, index) => ({
      player: player as `0x${string}`,
      ready: true,
      isHost: index === 0,
      isActive: true,
      ...NO_DICE,
    })),
    ...change,
  };
}

describe("liveGames", () => {
  it("keeps public games still being played, in the order they are given", () => {
    const games = liveGames([table(2n, { status: "revealing" }), table(1n)], ME);
    expect(games.map((game) => game.id)).toEqual([2n, 1n]);
    expect(games[1]).toMatchObject({
      round: 2,
      diceInPlay: 7,
      players: 2,
      seatCount: 2,
      buyIn: 0n,
    });
  });

  it("leaves out private, waiting, finished and cancelled tables", () => {
    const games = liveGames(
      [
        table(1n, { isPrivate: true }),
        table(2n, { status: "waiting" }),
        table(3n, { status: "finished" }),
        table(4n, { status: "cancelled" }),
        table(5n),
      ],
      ME
    );
    expect(games.map((game) => game.id)).toEqual([5n]);
  });

  it("leaves out a game the player is in", () => {
    expect(liveGames([table(1n, {}, [ADA, ME])], ME)).toEqual([]);
  });

  it("lists a table once even if its game started more than once", () => {
    expect(liveGames([table(1n), table(1n)], ME)).toHaveLength(1);
  });

  it("says when the computer is playing", () => {
    const [game] = liveGames([table(1n, {}, [ADA, BABA])], ME);
    expect(game?.hasComputer).toBe(true);
  });
});
