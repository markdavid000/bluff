type EndReason = "last-standing" | "clock" | "others-left" | "stuck";

export interface GameEnding {
  reason: EndReason;
  winners: readonly string[];
}

const REASONS: Record<number, EndReason> = {
  0: "last-standing",
  1: "clock",
  2: "others-left",
  3: "stuck",
};

function field(args: unknown, name: string): unknown {
  return typeof args === "object" && args !== null && name in args
    ? (args as Record<string, unknown>)[name]
    : undefined;
}

export function toGameEnding(args: unknown): GameEnding | null {
  const code = field(args, "reason");
  const winners = field(args, "winners");
  const reason = typeof code === "number" ? REASONS[code] : undefined;
  if (
    reason === undefined ||
    !Array.isArray(winners) ||
    !winners.every((winner) => typeof winner === "string")
  ) {
    return null;
  }
  return { reason, winners };
}
