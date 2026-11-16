"use client";

import { useSyncExternalStore } from "react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import { supportsWebGL } from "../lib/webgl";

type Listener = () => void;

let slow = false;
let webgl: boolean | null = null;
const listeners = new Set<Listener>();

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function canDraw3d(): boolean {
  webgl ??= supportsWebGL();
  return webgl && !slow;
}

export function resetSlowBoard() {
  slow = false;
  webgl = null;
  listeners.forEach((listener) => listener());
}

export function useBoardChoice() {
  const calm = useCalmMotion();
  const can3d = useSyncExternalStore(subscribe, canDraw3d, () => true);
  return {
    flat: calm || !can3d,
    reportSlow: () => {
      if (slow) return;
      slow = true;
      listeners.forEach((listener) => listener());
    },
  };
}
