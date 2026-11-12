"use client";

import { useSyncExternalStore } from "react";
import { resolveTokenColor } from "@/lib/css-color";

const THEME_TOKENS = [
  "--board",
  "--board-edge",
  "--cowrie",
  "--pattern",
  "--pattern-accent",
  "--seat-red",
  "--seat-green",
  "--seat-yellow",
  "--seat-blue",
] as const;

type ThemeToken = (typeof THEME_TOKENS)[number];

export type ThemeColors = Record<ThemeToken, string>;

let cached: { key: string; colors: ThemeColors } | null = null;

function snapshot(): ThemeColors | null {
  if (typeof document === "undefined") return null;
  const key = document.documentElement.className;
  if (cached?.key === key) return cached.colors;
  const colors = Object.fromEntries(
    THEME_TOKENS.map((token) => [token, resolveTokenColor(token)])
  ) as ThemeColors;
  cached = { key, colors };
  return colors;
}

function subscribe(onChange: () => void) {
  const observer = new MutationObserver(onChange);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  return () => observer.disconnect();
}

export function useThemeColors(): ThemeColors | null {
  return useSyncExternalStore(subscribe, snapshot, () => null);
}
