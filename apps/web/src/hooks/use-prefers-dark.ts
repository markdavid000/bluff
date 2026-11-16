"use client";

import { useMediaQuery } from "./use-media-query";

export function usePrefersDark(): boolean {
  return useMediaQuery("(prefers-color-scheme: dark)");
}
