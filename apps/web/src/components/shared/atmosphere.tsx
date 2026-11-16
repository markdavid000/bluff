"use client";

import { useCalmClass } from "@/hooks/use-calm-motion";
import { useBackgroundMusic } from "@/hooks/use-sound";
import { useThemeClass } from "@/hooks/use-theme-class";

export function Atmosphere() {
  useThemeClass();
  useCalmClass();
  useBackgroundMusic();
  return null;
}
