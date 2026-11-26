"use client";

import { useSyncExternalStore } from "react";

function subscribe(listener: () => void) {
  document.addEventListener("visibilitychange", listener);
  return () => document.removeEventListener("visibilitychange", listener);
}

function isVisible(): boolean {
  return document.visibilityState === "visible";
}

const VISIBLE_ON_SERVER = () => true;

export function usePageVisible(): boolean {
  return useSyncExternalStore(subscribe, isVisible, VISIBLE_ON_SERVER);
}
