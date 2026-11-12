"use client";

import { useSettings } from "@/hooks/use-settings";
import { useBackgroundMusic } from "@/hooks/use-sound";
import { useThemeClass } from "@/hooks/use-theme-class";

export function useDesignSettings() {
  const { settings, update } = useSettings();
  useThemeClass();
  useBackgroundMusic("table");

  return {
    settings,
    setTheme: (theme: "day" | "night") => update({ theme }),
    toggleSounds: () => update({ sounds: !settings.sounds }),
    toggleMusic: () => update({ music: !settings.music }),
  };
}
