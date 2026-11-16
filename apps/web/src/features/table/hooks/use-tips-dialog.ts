"use client";

import { useState } from "react";
import { useSettings } from "@/hooks/use-settings";

export const TIPS = ["wild-ones", "at-least", "how-to-raise", "call-bluff"] as const;

export type Tip = (typeof TIPS)[number];

export function useTipsDialog() {
  const { settings, update } = useSettings();
  const [step, setStep] = useState(0);
  const seen = TIPS.every((tip) => settings.seenTips.includes(tip));
  const tip = TIPS[Math.min(step, TIPS.length - 1)] ?? TIPS[0];
  return {
    open: !seen,
    step,
    total: TIPS.length,
    tip,
    last: step >= TIPS.length - 1,
    next: () => setStep((current) => Math.min(current + 1, TIPS.length - 1)),
    done: () => update({ seenTips: [...new Set([...settings.seenTips, ...TIPS])] }),
  };
}
