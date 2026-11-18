"use client";

import { useState } from "react";
import type { Bid, BidFace, Face } from "@bluff/game";
import { faceAvailable, fewer, isAllowed, more, startingChoice, withFace } from "../lib/bid-choice";

export function useBidChoice(current: Bid | null, diceInPlay: number, ownFaces: readonly Face[]) {
  const [draft, setDraft] = useState<Bid | null>(null);
  const choice =
    draft !== null && isAllowed(draft, current, diceInPlay)
      ? draft
      : startingChoice(current, diceInPlay, ownFaces);
  const keep = (next: Bid | null) => {
    if (next !== null) setDraft(next);
  };
  return {
    choice,
    canMore: choice !== null && more(choice, diceInPlay) !== null,
    canFewer: choice !== null && fewer(choice, current) !== null,
    faceAvailable: (face: BidFace) => faceAvailable(face, current, diceInPlay),
    setFace: (face: BidFace) => choice && keep(withFace(choice, face, current, diceInPlay)),
    more: () => choice && keep(more(choice, diceInPlay)),
    fewer: () => choice && keep(fewer(choice, current)),
    pick: (bid: Bid) => setDraft(bid),
    clear: () => setDraft(null),
  };
}
