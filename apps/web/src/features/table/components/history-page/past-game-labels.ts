import { formatChips } from "@/lib/chips";
import { tableCopy } from "../../copy";
import type { GameOutcome } from "../../lib/game-log";

const DATE = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });

export function startedLabel(startedAt: number): string {
  return tableCopy.pastStarted(DATE.format(new Date(startedAt)));
}

export function chipsLabel(chips: GameOutcome["chips"]): string | null {
  if (chips === null) return null;
  if (chips > 0n) return tableCopy.pastChipsUp(formatChips(chips));
  if (chips < 0n) return tableCopy.pastChipsDown(formatChips(-chips));
  return tableCopy.pastChipsEven;
}

export const RESULT_TONE: Record<GameOutcome["result"], string> = {
  won: "bg-seat-green text-seat-foreground",
  shared: "bg-seat-green text-seat-foreground",
  lost: "bg-seat-red text-seat-foreground",
  left: "bg-tile text-tile-foreground",
  stopped: "bg-tile text-tile-foreground",
  playing: "bg-seat-yellow text-seat-yellow-foreground",
  unknown: "bg-tile text-tile-foreground",
};
