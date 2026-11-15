import { type BidFace, countMatching } from "@/lib/bid-rules";
import type { Face } from "@/lib/dice-physics";

export interface RevealedSeat {
  faces: Face[];
  counting: boolean[];
}

function isFace(value: number): value is Face {
  return Number.isInteger(value) && value >= 1 && value <= 6;
}

export function revealedBySeat(
  faces: readonly number[],
  counts: readonly number[],
  bidFace: BidFace
): (RevealedSeat | null)[] | null {
  const total = counts.reduce((sum, count) => sum + count, 0);
  if (total !== faces.length || !faces.every(isFace)) return null;
  let next = 0;
  return counts.map((count) => {
    if (count === 0) return null;
    const seatFaces = faces.slice(next, next + count);
    next += count;
    return {
      faces: seatFaces,
      counting: seatFaces.map((face) => countMatching([face], bidFace) === 1),
    };
  });
}
