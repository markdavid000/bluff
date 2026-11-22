"use client";

import { useSyncExternalStore } from "react";
import { publicEnv } from "@/config/env";
import { type ComputerOutcome, requestComputer } from "@/lib/computer-seat";

export interface ComputerCall {
  tableId: bigint;
  phase: "asking" | "waking" | "answered";
  outcome: ComputerOutcome | null;
}

let current: ComputerCall | null = null;
const listeners = new Set<() => void>();

function set(next: ComputerCall | null) {
  current = next;
  listeners.forEach((listener) => listener());
}

function update(tableId: bigint, change: Partial<ComputerCall>) {
  if (current?.tableId === tableId) set({ ...current, ...change });
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function callComputer(tableId: bigint) {
  set({ tableId, phase: "asking", outcome: null });
  void requestComputer({
    botUrl: publicEnv.botUrl,
    tableId,
    onWaking: () => update(tableId, { phase: "waking" }),
  })
    .catch((error: unknown): ComputerOutcome => {
      console.error("The computer gave an answer we could not read.", error);
      return { kind: "unavailable" };
    })
    .then((outcome) => update(tableId, { phase: "answered", outcome }));
}

export function finishComputerCall(tableId: bigint) {
  if (current?.tableId === tableId) set(null);
}

export function useComputerCall(): ComputerCall | null {
  return useSyncExternalStore(
    subscribe,
    () => current,
    () => null
  );
}
