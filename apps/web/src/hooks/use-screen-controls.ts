"use client";

import type { BoardSetting, MusicTrack } from "@/lib/settings-store";
import { isNight } from "@/lib/theme";
import { usePrefersDark } from "./use-prefers-dark";
import { useSettings } from "./use-settings";

export function useScreenControls() {
  const { settings, update } = useSettings();
  const night = isNight(settings.theme, usePrefersDark());
  return {
    night,
    sounds: settings.sounds,
    music: settings.music,
    musicTrack: settings.musicTrack,
    chooseMusic: (musicTrack: MusicTrack) => update({ musicTrack, music: true }),
    toggleTheme: () => update({ theme: night ? "day" : "night" }),
    toggleSounds: () => update({ sounds: !settings.sounds }),
    toggleMusic: () => update({ music: !settings.music }),
    calm: settings.calmMotion,
    board: settings.board,
    chooseBoard: (board: BoardSetting) => update({ board }),
    toggleCalm: () => update({ calmMotion: !settings.calmMotion }),
  };
}
