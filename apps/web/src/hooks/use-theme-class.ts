"use client";

import { useEffect } from "react";
import { isNight } from "@/lib/theme";
import { usePrefersDark } from "./use-prefers-dark";
import { useSettings } from "./use-settings";

export function useThemeClass() {
  const { settings } = useSettings();
  const deviceIsDark = usePrefersDark();
  const night = isNight(settings.theme, deviceIsDark);
  useEffect(() => {
    document.documentElement.classList.toggle("dark", night);
  }, [night]);
}
