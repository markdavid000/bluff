"use client";

import { useSyncExternalStore } from "react";

const leftTables = new Set<string>();
const goneSeats = new Set<string>();
const listeners = new Set<() => void>();

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function change(update: () => void) {
  update();
  listeners.forEach((listener) => listener());
}

export function markSeatGone(id: bigint) {
  change(() => goneSeats.add(id.toString()));
}

export function markLeftTable(id: bigint) {
  change(() => {
    leftTables.add(id.toString());
    goneSeats.add(id.toString());
  });
}

export function forgetLeftTable(id: bigint) {
  change(() => leftTables.delete(id.toString()));
}

export function forgetGoneSeats(keep: bigint | null = null) {
  if (![...goneSeats].some((seat) => seat !== keep?.toString())) return;
  change(() => {
    for (const seat of goneSeats) if (seat !== keep?.toString()) goneSeats.delete(seat);
  });
}

export function useHasLeftTable(id: bigint): boolean {
  return useSyncExternalStore(
    subscribe,
    () => leftTables.has(id.toString()),
    () => false
  );
}

export function useIsSeatGone(id: bigint | null): boolean {
  return useSyncExternalStore(
    subscribe,
    () => id !== null && goneSeats.has(id.toString()),
    () => false
  );
}
