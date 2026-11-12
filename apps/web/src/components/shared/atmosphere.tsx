"use client";

import { useBackgroundMusic } from "@/hooks/use-sound";
import { useThemeClass } from "@/hooks/use-theme-class";

export function Atmosphere() {
  useThemeClass();
  useBackgroundMusic();
  return null;
}
