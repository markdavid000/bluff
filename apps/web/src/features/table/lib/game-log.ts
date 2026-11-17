import type { GameEnding } from "./game-end";
import { potOf, shareOf } from "./payout";
import type { Table } from "./table-view";

export interface FoundGame {
  id: bigint;
  block: bigint;
}

type GameResult = "won" | "shared" | "lost" | "left" | "stopped" | "playing" | "unknown";

export interface GameOutcome {
  result: GameResult;
  winners: readonly string[];
  chips: bigint | null;
}

export function blockSpans(from: bigint, to: bigint, size: bigint): [bigint, bigint][] {
  const spans: [bigint, bigint][] = [];
  for (let start = from; start <= to; start += size) {
    const end = start + size - 1n;
    spans.push([start, end < to ? end : to]);
  }
  return spans;
}

export function mergeGames(
  remembered: readonly FoundGame[],
  found: readonly FoundGame[]
): FoundGame[] {
  const byId = new Map<bigint, FoundGame>();
  for (const game of [...remembered, ...found]) byId.set(game.id, game);
  return [...byId.values()].sort((a, b) =>
    a.block === b.block ? (a.id < b.id ? 1 : -1) : a.block < b.block ? 1 : -1
  );
}

function chipsOrNone(buyIn: bigint, amount: bigint): bigint | null {
  return buyIn === 0n ? null : amount;
}

export function gameOutcome({
  table,
  ending,
  me,
  left,
}: {
  table: Table;
  ending: GameEnding | null;
  me: string;
  left: boolean;
}): GameOutcome {
  if (table.status !== "finished") return { result: "playing", winners: [], chips: null };
  if (ending === null) return { result: "unknown", winners: [], chips: null };
  const { buyIn } = table;
  if (ending.reason === "stuck") {
    return { result: "stopped", winners: [], chips: chipsOrNone(buyIn, 0n) };
  }
  const { winners } = ending;
  if (left) return { result: "left", winners, chips: chipsOrNone(buyIn, -buyIn) };
  const share = shareOf(potOf(buyIn, table.seats.length), winners, me);
  if (share === null) return { result: "lost", winners, chips: chipsOrNone(buyIn, -buyIn) };
  return {
    result: winners.length > 1 ? "shared" : "won",
    winners,
    chips: chipsOrNone(buyIn, share - buyIn),
  };
}

export interface HistoryGame {
  table: Table;
  outcome: GameOutcome;
  reason: GameEnding["reason"] | null;
}

const NOT_STARTED = new Set<Table["status"]>(["waiting", "verifying", "cancelled"]);

function sameAddress(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

export function historyGames({
  tables,
  joins,
  lefts,
  endings,
  me,
}: {
  tables: readonly Table[];
  joins: readonly FoundGame[];
  lefts: readonly FoundGame[];
  endings: ReadonlyMap<bigint, GameEnding>;
  me: string;
}): HistoryGame[] {
  return tables.flatMap((table) => {
    if (NOT_STARTED.has(table.status)) return [];
    if (!table.seats.some((seat) => sameAddress(seat.player, me))) return [];
    const joinedAt = joins.find((join) => join.id === table.id)?.block ?? 0n;
    const left = lefts.some((leave) => leave.id === table.id && leave.block > joinedAt);
    const ending = endings.get(table.id) ?? null;
    return [
      {
        table,
        outcome: gameOutcome({ table, ending, me, left }),
        reason: ending?.reason ?? null,
      },
    ];
  });
}
