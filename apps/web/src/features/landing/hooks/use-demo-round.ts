"use client";

import { useEffect, useState } from "react";
import { useCalmMotion } from "@/hooks/use-calm-motion";

export const DEMO_STEPS = ["deal", "bid1", "bid2", "bid3", "call", "reveal", "result"] as const;
export type DemoStep = (typeof DEMO_STEPS)[number];

export const STEP_MS: Record<DemoStep, number> = {
  deal: 1_400,
  bid1: 1_700,
  bid2: 1_700,
  bid3: 1_700,
  call: 1_300,
  reveal: 2_400,
  result: 2_800,
};

function stepAt(index: number): DemoStep {
  const step = DEMO_STEPS[index];
  if (step === undefined) throw new Error(`No demo step at ${index}.`);
  return step;
}

export function useDemoRound(): DemoStep {
  const calm = useCalmMotion();
  const [index, setIndex] = useState(0);
  const step = stepAt(index);

  useEffect(() => {
    if (calm) return;
    const timer = window.setTimeout(
      () => setIndex((now) => (now + 1) % DEMO_STEPS.length),
      STEP_MS[step]
    );
    return () => window.clearTimeout(timer);
  }, [calm, step, index]);

  return calm ? "reveal" : step;
}
