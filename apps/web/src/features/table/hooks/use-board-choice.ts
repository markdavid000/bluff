"use client";

import { useSyncExternalStore } from "react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import { useSettings } from "@/hooks/use-settings";
import { supportsWebGL } from "../lib/webgl";

type Listener = () => void;

let slow = false;
let webgl: boolean | null = null;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function boardState(): "none" | "slow" | "fine" {
  webgl ??= supportsWebGL();
  if (!webgl) return "none";
  return slow ? "slow" : "fine";
}

export function resetSlowBoard() {
  slow = false;
  webgl = null;
  listeners.forEach((listener) => listener());
}

export function useBoardChoice() {
  const calm = useCalmMotion();
  const { settings } = useSettings();
  const device = useSyncExternalStore(subscribe, boardState, () => "fine" as const);
  const automatic = settings.board === "auto" && (calm || device === "slow");
  return {
    flat: device === "none" || settings.board === "flat" || automatic,
    reportSlow: () => {
      if (slow) return;
      slow = true;
      listeners.forEach((listener) => listener());
    },
  };
}
