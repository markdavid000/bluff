import {
  type Bid,
  type BidFace,
  isHigher,
  isValidFace,
  isValidQuantity,
  legalBids,
  quickPicks,
} from "@/lib/bid-rules";
import type { Face } from "@/lib/dice-physics";

export function lowestFor(face: BidFace, current: Bid | null): number {
  if (current === null) return 1;
  return face > current.face ? current.quantity : current.quantity + 1;
}

export function faceAvailable(face: BidFace, current: Bid | null, diceInPlay: number): boolean {
  return lowestFor(face, current) <= diceInPlay;
}

export function startingChoice(
  current: Bid | null,
  diceInPlay: number,
  ownFaces: readonly Face[]
): Bid | null {
  if (current === null) return quickPicks(null, diceInPlay, ownFaces)[0] ?? null;
  return legalBids(current, diceInPlay)[0] ?? null;
}

export function withFace(
  choice: Bid,
  face: BidFace,
  current: Bid | null,
  diceInPlay: number
): Bid | null {
  if (!faceAvailable(face, current, diceInPlay)) return null;
  return { quantity: Math.max(choice.quantity, lowestFor(face, current)), face };
}

export function more(choice: Bid, diceInPlay: number): Bid | null {
  return choice.quantity < diceInPlay ? { ...choice, quantity: choice.quantity + 1 } : null;
}

export function fewer(choice: Bid, current: Bid | null): Bid | null {
  return choice.quantity > lowestFor(choice.face, current)
    ? { ...choice, quantity: choice.quantity - 1 }
    : null;
}

export function isAllowed(choice: Bid, current: Bid | null, diceInPlay: number): boolean {
  return (
    isValidFace(choice.face) &&
    isValidQuantity(choice.quantity, diceInPlay) &&
    isHigher(choice, current)
  );
}
