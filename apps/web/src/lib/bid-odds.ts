import { type Bid, countMatching } from "./bid-rules";
import type { Face } from "./dice-physics";

const MATCH_CHANCE = 1 / 3;
const SAFE_FROM = 0.6;
const RISKY_FROM = 0.3;

export type BidRisk = "safe" | "risky" | "very-risky";

function choose(n: number, k: number): number {
  let result = 1;
  for (let i = 1; i <= k; i++) result = (result * (n - k + i)) / i;
  return result;
}

export function bidChance(bid: Bid, ownFaces: readonly Face[], hiddenDice: number): number {
  const needed = bid.quantity - countMatching(ownFaces, bid.face);
  if (needed <= 0) return 1;
  if (needed > hiddenDice) return 0;
  let chance = 0;
  for (let matches = needed; matches <= hiddenDice; matches++) {
    chance +=
      choose(hiddenDice, matches) *
      MATCH_CHANCE ** matches *
      (1 - MATCH_CHANCE) ** (hiddenDice - matches);
  }
  return Math.min(chance, 1);
}

export function bidRisk(chance: number): BidRisk {
  if (chance >= SAFE_FROM) return "safe";
  if (chance >= RISKY_FROM) return "risky";
  return "very-risky";
}
