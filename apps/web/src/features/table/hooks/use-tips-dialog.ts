"use client";

import { useEffect, useState } from "react";
import { useSettings } from "@/hooks/use-settings";
import { hideTips, showTips, useTipsRequested } from "@/hooks/use-tips-request";

export const TIPS = ["wild-ones", "at-least", "how-to-raise", "call-bluff"] as const;

export type Tip = (typeof TIPS)[number];

export function useTipsOnFirstVisit() {
  const { settings } = useSettings();
  const seen = TIPS.every((tip) => settings.seenTips.includes(tip));
  useEffect(() => {
    if (!seen) showTips();
  }, [seen]);
}

export function useTipsDialog() {
  const { settings, update } = useSettings();
  return {
    open: useTipsRequested(),
    done: () => {
      update({ seenTips: [...new Set([...settings.seenTips, ...TIPS])] });
      hideTips();
    },
  };
}

export function useTipSteps() {
  const [step, setStep] = useState(0);
  return {
    step,
    total: TIPS.length,
    tip: TIPS[Math.min(step, TIPS.length - 1)] ?? TIPS[0],
    last: step >= TIPS.length - 1,
    next: () => setStep((current) => Math.min(current + 1, TIPS.length - 1)),
  };
}
