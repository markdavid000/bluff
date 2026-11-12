"use client";

import { useSyncExternalStore } from "react";
import { type Settings, settingsStore } from "@/lib/settings-store";

export function useSettings(): {
  settings: Settings;
  update: (change: Partial<Settings>) => void;
} {
  const store = settingsStore();
  const settings = useSyncExternalStore(store.subscribe, store.get, store.getServer);
  return { settings, update: store.update };
}
