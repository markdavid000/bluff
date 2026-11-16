"use client";

import { useSyncExternalStore } from "react";
import { useSettings } from "@/hooks/use-settings";
import { supportsWebGL } from "../lib/webgl";

let webgl: boolean | null = null;

function subscribe() {
  return () => undefined;
}

function canDraw3d(): boolean {
  webgl ??= supportsWebGL();
  return webgl;
}

export function forgetBoardCheck() {
  webgl = null;
}

export function useBoardChoice(): boolean {
  const { settings } = useSettings();
  const can3d = useSyncExternalStore(subscribe, canDraw3d, () => true);
  return settings.board === "flat" || !can3d;
}
