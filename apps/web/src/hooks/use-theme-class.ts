"use client";

import { useEffect } from "react";
import { useSettings } from "./use-settings";

export function useThemeClass() {
  const { settings } = useSettings();
  useEffect(() => {
    document.documentElement.classList.toggle("dark", settings.theme === "night");
  }, [settings.theme]);
}
