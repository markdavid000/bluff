"use client";

import { useSyncExternalStore } from "react";

let signingOut = false;
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function setSigningOut(value: boolean) {
  if (signingOut === value) return;
  signingOut = value;
  listeners.forEach((listener) => listener());
}

export function startSigningOut() {
  setSigningOut(true);
}

export function stopSigningOut() {
  setSigningOut(false);
}

export function isSigningOut(): boolean {
  return signingOut;
}

export function useSigningOut(): boolean {
  return useSyncExternalStore(subscribe, isSigningOut, () => false);
}
