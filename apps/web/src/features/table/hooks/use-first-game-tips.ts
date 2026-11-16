"use client";

import { useEffect, useEffectEvent, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { notify } from "@/lib/notify";
import { tableCopy } from "../copy";
import { COACH_DELAY_MS, COACH_ID, COACH_STAYS_MS } from "./use-coach-tips";

type FirstTip = keyof typeof tableCopy.firstTips;

const TIPS: readonly { tip: FirstTip; needsBid: boolean }[] = [
  { tip: "wild-ones", needsBid: false },
  { tip: "at-least", needsBid: false },
  { tip: "how-to-raise", needsBid: true },
  { tip: "call-bluff", needsBid: true },
];

export function useFirstGameTips({
  myTurn,
  turnKey,
  hasBid,
}: {
  myTurn: boolean;
  turnKey: string;
  hasBid: boolean;
}): { tipTurn: boolean } {
  const { settings, update } = useSettings();
  const [chosen, setChosen] = useState<{ turnKey: string; tip: FirstTip | null } | null>(null);
  let turn = chosen;
  if (myTurn && chosen?.turnKey !== turnKey) {
    const next =
      TIPS.find(({ tip, needsBid }) => !settings.seenTips.includes(tip) && (hasBid || !needsBid))
        ?.tip ?? null;
    turn = { turnKey, tip: next };
    setChosen(turn);
  }
  const tip = myTurn && turn?.turnKey === turnKey ? turn.tip : null;
  const showKey = tip ? `${turnKey}-${tip}` : null;

  const show = useEffectEvent(() => {
    if (!tip) return;
    notify.info(tableCopy.firstTips[tip], {
      id: COACH_ID,
      icon: "target",
      staysMs: COACH_STAYS_MS,
      action: { label: tableCopy.gotIt, onPress: () => notify.dismiss(COACH_ID) },
    });
    if (!settings.seenTips.includes(tip)) update({ seenTips: [...settings.seenTips, tip] });
  });

  useEffect(() => {
    if (showKey === null) return;
    const timer = window.setTimeout(() => show(), COACH_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [showKey]);

  return { tipTurn: tip !== null };
}
