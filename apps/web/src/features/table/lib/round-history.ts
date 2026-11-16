export interface HistoryEvent {
  eventName: string;
  args: unknown;
}

export interface HistoryBid {
  player: string;
  quantity: number;
  face: number;
}

export type RoundEnd =
  { kind: "called"; holds: boolean; loser: string } | { kind: "timeout"; player: string };

export interface HistoryRound {
  round: number;
  bids: HistoryBid[];
  end: RoundEnd | null;
}

function field(args: unknown, name: string): unknown {
  return typeof args === "object" && args !== null && name in args
    ? (args as Record<string, unknown>)[name]
    : undefined;
}

function count(args: unknown, name: string): number | undefined {
  const value = field(args, name);
  return typeof value === "number" ? value : undefined;
}

function text(args: unknown, name: string): string | undefined {
  const value = field(args, name);
  return typeof value === "string" ? value : undefined;
}

export function roundHistory(events: readonly HistoryEvent[]): HistoryRound[] {
  const rounds: HistoryRound[] = [];
  for (const { eventName, args } of events) {
    const current = rounds.at(-1);
    if (eventName === "RoundStarted") {
      const round = count(args, "round");
      if (round !== undefined) rounds.push({ round, bids: [], end: null });
      continue;
    }
    if (!current || current.end) continue;
    if (eventName === "BidPlaced") {
      const round = count(args, "round");
      const player = text(args, "player");
      const quantity = count(args, "quantity");
      const face = count(args, "face");
      if (round === current.round && player && quantity !== undefined && face !== undefined) {
        current.bids.push({ player, quantity, face });
      }
    } else if (eventName === "RoundSettled") {
      const quantity = count(args, "quantity");
      const matched = count(args, "count");
      const loser = text(args, "loser");
      if (quantity !== undefined && matched !== undefined && loser) {
        current.end = { kind: "called", holds: matched >= quantity, loser };
      }
    } else if (eventName === "TurnTimedOut") {
      const player = text(args, "player");
      if (player) current.end = { kind: "timeout", player };
    }
  }
  return rounds.reverse();
}

function sameBid(a: HistoryBid, b: HistoryBid): boolean {
  return (
    a.player.toLowerCase() === b.player.toLowerCase() &&
    a.quantity === b.quantity &&
    a.face === b.face
  );
}

export function withCurrentBid(
  rounds: readonly HistoryRound[],
  round: number,
  bid: HistoryBid | null
): HistoryRound[] {
  const [latest, ...older] = rounds;
  const current: HistoryRound = latest?.round === round ? latest : { round, bids: [], end: null };
  const rest = latest?.round === round ? older : rounds;
  const last = current.bids.at(-1);
  const bids = bid && !(last && sameBid(last, bid)) ? [...current.bids, bid] : current.bids;
  if (current === latest && bids === current.bids) return [...rounds];
  return [{ ...current, bids }, ...rest];
}
