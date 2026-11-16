"use client";

import { useEffect, useEffectEvent } from "react";
import type { BidRisk } from "@/lib/bid-odds";
import type { Bid } from "@/lib/bid-rules";
import { notify } from "@/lib/notify";
import { tableCopy } from "../copy";

export const COACH_DELAY_MS = 600;
export const COACH_STAYS_MS = 10_000;
export const COACH_ID = "coach";

function words(bid: Bid) {
  return tableCopy.bid(bid.quantity, tableCopy.faceWords[bid.face - 1] ?? String(bid.face));
}

export function useCoachTips({
  myTurn,
  choice,
  risk,
  safer,
  paused,
  onPick,
}: {
  myTurn: boolean;
  choice: Bid | null;
  risk: BidRisk | null;
  safer: Bid | null;
  paused: boolean;
  onPick: (bid: Bid) => void;
}) {
  const key =
    myTurn && !paused && choice && risk ? `${choice.quantity}-${choice.face}-${risk}` : null;

  const speak = useEffectEvent(() => {
    if (!choice || !risk) return;
    notify.info(tableCopy.coachTip[risk](words(choice)), {
      id: COACH_ID,
      icon: "target",
      staysMs: COACH_STAYS_MS,
      action:
        risk !== "safe" && safer
          ? { label: tableCopy.trySafer(words(safer)), onPress: () => onPick(safer) }
          : undefined,
    });
  });

  useEffect(() => {
    if (key === null) return;
    const timer = window.setTimeout(() => speak(), COACH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [key]);

  useEffect(() => {
    if (!myTurn) notify.dismiss(COACH_ID);
  }, [myTurn]);
}
