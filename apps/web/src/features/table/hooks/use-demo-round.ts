"use client";

import { useEffect, useState } from "react";
import { useCalmMotion } from "@/hooks/use-calm-motion";

export const DEMO_STEPS = ["deal", "bid1", "bid2", "bid3", "call", "reveal", "result"] as const;
export type DemoStep = (typeof DEMO_STEPS)[number];

export const STEP_MS: Record<DemoStep, number> = {
  deal: 2_600,
  bid1: 1_700,
  bid2: 1_700,
  bid3: 1_700,
  call: 1_300,
  reveal: 3_000,
  result: 2_800,
};

function stepAt(index: number): DemoStep {
  const step = DEMO_STEPS[index];
  if (step === undefined) throw new Error(`No demo step at ${index}.`);
  return step;
}

export function useDemoRound(onScreen: boolean): { step: DemoStep; round: number } {
  const calm = useCalmMotion();
  const [played, setPlayed] = useState(0);
  const step = stepAt(played % DEMO_STEPS.length);

  useEffect(() => {
    if (calm || !onScreen) return;
    const timer = window.setTimeout(() => setPlayed((now) => now + 1), STEP_MS[step]);
    return () => window.clearTimeout(timer);
  }, [calm, onScreen, step, played]);

  return {
    step: calm ? "reveal" : step,
    round: Math.floor(played / DEMO_STEPS.length) + 1,
  };
}
