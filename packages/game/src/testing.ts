import type { Seat, Table } from "./table-view";

export const NO_GAME = {
  dicePerPlayer: 4,
  diceInPlay: 0,
  startedAt: 0,
  round: 0,
  turn: 0,
  roundStarter: 0,
  bid: null,
  caller: null,
} satisfies Partial<Table>;

export const NO_DICE = { dice: 0, missedTurns: 0 } satisfies Partial<Seat>;
