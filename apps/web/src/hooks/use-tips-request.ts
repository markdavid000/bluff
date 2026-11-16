"use client";

import { useSyncExternalStore } from "react";

let requested = false;
const listeners = new Set<() => void>();

function set(open: boolean) {
  requested = open;
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function showTips() {
  set(true);
}

export function hideTips() {
  set(false);
}

export function useTipsRequested(): boolean {
  return useSyncExternalStore(
    subscribe,
    () => requested,
    () => false
  );
}
