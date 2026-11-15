import type { Face } from "./dice-physics";

export type BidFace = 2 | 3 | 4 | 5 | 6;

export interface Bid {
  quantity: number;
  face: BidFace;
}

export const BID_FACES: readonly BidFace[] = [2, 3, 4, 5, 6];
const WILD_FACE = 1;
const TOP_FACE = 6;
const QUICK_PICKS = 3;

export function isValidFace(face: number): face is BidFace {
  return face >= 2 && face <= TOP_FACE && Number.isInteger(face);
}

export function isValidQuantity(quantity: number, diceInPlay: number): boolean {
  return quantity >= 1 && quantity <= diceInPlay;
}

export function isHigher(next: Bid, current: Bid | null): boolean {
  if (current === null) return true;
  return (
    next.quantity > current.quantity ||
    (next.quantity === current.quantity && next.face > current.face)
  );
}

export function isMaximal(bid: Bid, diceInPlay: number): boolean {
  return bid.quantity === diceInPlay && bid.face === TOP_FACE;
}

export function countMatching(faces: readonly Face[], face: BidFace): number {
  return faces.filter((value) => value === face || value === WILD_FACE).length;
}

function isLegal(bid: Bid, current: Bid | null, diceInPlay: number): boolean {
  return (
    isValidFace(bid.face) && isValidQuantity(bid.quantity, diceInPlay) && isHigher(bid, current)
  );
}

export function legalBids(current: Bid | null, diceInPlay: number): Bid[] {
  const bids: Bid[] = [];
  for (let quantity = 1; quantity <= diceInPlay; quantity++) {
    for (const face of BID_FACES) {
      const bid = { quantity, face };
      if (isHigher(bid, current)) bids.push(bid);
    }
  }
  return bids;
}

function firstBidPicks(ownFaces: readonly Face[]): Bid[] {
  return [...BID_FACES]
    .map((face) => ({ face, count: countMatching(ownFaces, face) }))
    .sort((a, b) => b.count - a.count || b.face - a.face)
    .slice(0, QUICK_PICKS)
    .map(({ face, count }) => ({ quantity: Math.max(count, 1), face }));
}

export function quickPicks(
  current: Bid | null,
  diceInPlay: number,
  ownFaces: readonly Face[]
): Bid[] {
  const ideas =
    current === null
      ? firstBidPicks(ownFaces)
      : [
          { quantity: current.quantity, face: (current.face + 1) as BidFace },
          { quantity: current.quantity + 1, face: BID_FACES[0] },
          { quantity: current.quantity + 1, face: current.face },
        ];
  const picks: Bid[] = [];
  for (const idea of ideas) {
    if (!isLegal(idea, current, diceInPlay)) continue;
    if (picks.some((pick) => pick.quantity === idea.quantity && pick.face === idea.face)) continue;
    picks.push(idea);
  }
  return picks;
}
