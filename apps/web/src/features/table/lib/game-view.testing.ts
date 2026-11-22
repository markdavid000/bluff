import { vi } from "vitest";
import type { useGame } from "../hooks/use-game";
import { NO_GAME } from "@bluff/game/testing";
import type { Table } from "@bluff/game";

export type GameView = NonNullable<ReturnType<typeof useGame>["view"]>;

export const ME = "0x0000000000000000000000000000000000001a2b";
const FOX = "0x0000000000000000000000000000000000003c4d";

export function aTable(overrides: Partial<Table> = {}): Table {
  return {
    id: 12n,
    host: ME,
    status: "playing",
    isPrivate: false,
    seatCount: 2,
    buyIn: 0n,
    deadline: 0,
    ...NO_GAME,
    diceInPlay: 8,
    round: 1,
    seats: [],
    ...overrides,
  };
}

export function gameView(overrides: Partial<GameView> = {}): GameView {
  const table = overrides.table ?? aTable();
  return {
    table,
    seats: [
      {
        player: ME,
        ready: false,
        isHost: true,
        isActive: true,
        dice: 4,
        missedTurns: 0,
        isMe: true,
        isComputer: false,
        isTurn: true,
        name: "Me #1A2B",
        avatarSrc: "/a.svg",
        lastBid: null,
      },
      {
        player: FOX,
        ready: true,
        isHost: false,
        isActive: true,
        dice: 4,
        missedTurns: 0,
        isMe: false,
        isComputer: false,
        isTurn: false,
        name: "Sly Fox #3C4D",
        avatarSrc: "/b.svg",
        lastBid: { quantity: 3, face: 4 },
      },
    ],
    mySeat: 0,
    stillIn: true,
    myTurn: true,
    line: "Your turn",
    bid: { quantity: 3, face: 4 },
    bidderName: "Sly Fox #3C4D",
    choice: {
      choice: { quantity: 3, face: 5 },
      canMore: true,
      canFewer: false,
      faceAvailable: () => true,
      setFace: vi.fn(),
      more: vi.fn(),
      fewer: vi.fn(),
      pick: vi.fn(),
      clear: vi.fn(),
    },
    matching: [true, true, false, false],
    dice: { status: "ready", faces: [5, 1, 3, 3] },
    turnLeft: 20_000,
    turnFraction: 0.6,
    turnLow: false,
    clockLeft: 600_000,
    pot: 0n,
    reveal: null,
    revealedDice: null,
    dismissReveal: vi.fn(),
    end: { status: "loading" },
    myShare: null,
    winnerNames: [],
    iWon: false,
    showResults: true,
    left: false,
    bidder: null,
    boardRevealed: table.status === "revealing",
    boardRound: table.round,
    placing: false,
    calling: false,
    leaving: false,
    busy: false,
    confirm: false,
    placeBid: vi.fn(),
    callBluff: vi.fn(),
    leave: vi.fn(),
    ...overrides,
  };
}
