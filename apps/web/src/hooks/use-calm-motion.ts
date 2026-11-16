"use client";

import { useReducedMotion } from "motion/react";
import { useEffect } from "react";
import { useSettings } from "./use-settings";

export function useCalmMotion(): boolean {
  const device = useReducedMotion() === true;
  const { settings } = useSettings();
  return device || settings.calmMotion;
}

export function useCalmClass() {
  const { settings } = useSettings();
  const calm = settings.calmMotion;
  useEffect(() => {
    document.documentElement.classList.toggle("calm", calm);
  }, [calm]);
}
