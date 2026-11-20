import { type Bid, type Face, bidChance, countMatching, legalBids } from "@bluff/game";

export const STRATEGY = { callBelow: 0.35, openFrom: 0.5, bluffShare: 0.15 } as const;

export interface TurnView {
  bid: Bid | null;
  diceInPlay: number;
  ownFaces: readonly Face[];
}

export type Move = { kind: "bid"; bid: Bid } | { kind: "call" };

interface Scored {
  bid: Bid;
  chance: number;
}

function scored(bids: readonly Bid[], view: TurnView): Scored[] {
  const hidden = view.diceInPlay - view.ownFaces.length;
  return bids.map((bid) => ({ bid, chance: bidChance(bid, view.ownFaces, hidden) }));
}

function isLower(a: Bid, b: Bid): boolean {
  return a.quantity < b.quantity || (a.quantity === b.quantity && a.face < b.face);
}

function opening(view: TurnView): Bid {
  const likely = scored(legalBids(null, view.diceInPlay), view).filter(
    ({ chance }) => chance >= STRATEGY.openFrom
  );
  const best = likely.reduce<Scored | null>(
    (top, next) =>
      top === null ||
      next.bid.quantity > top.bid.quantity ||
      (next.bid.quantity === top.bid.quantity && next.bid.face > top.bid.face)
        ? next
        : top,
    null
  );
  if (best === null)
    throw new Error("No opening bid is at least even odds, which a wild die makes impossible");
  return best.bid;
}

function bluff(raises: readonly Bid[], view: TurnView): Bid | null {
  const unheld = raises.filter((raise) => countMatching(view.ownFaces, raise.face) === 0);
  return unheld.reduce<Bid | null>(
    (low, next) => (low === null || isLower(next, low) ? next : low),
    null
  );
}

function safest(raises: readonly Bid[], view: TurnView): Bid {
  const [first, ...rest] = scored(raises, view);
  if (first === undefined) throw new Error("A raise was asked for when none is legal");
  return rest.reduce(
    (top, next) =>
      next.chance > top.chance || (next.chance === top.chance && isLower(next.bid, top.bid))
        ? next
        : top,
    first
  ).bid;
}

export function chooseMove(view: TurnView, random: () => number): Move {
  if (view.bid === null) return { kind: "bid", bid: opening(view) };
  const raises = legalBids(view.bid, view.diceInPlay);
  if (raises.length === 0) return { kind: "call" };
  const chance = bidChance(view.bid, view.ownFaces, view.diceInPlay - view.ownFaces.length);
  if (chance < STRATEGY.callBelow) return { kind: "call" };
  const bluffBid = random() < STRATEGY.bluffShare ? bluff(raises, view) : null;
  return { kind: "bid", bid: bluffBid ?? safest(raises, view) };
}
