import type { ThemeSetting } from "./theme";

export const MUSIC_TRACKS = ["drum", "bell", "both"] as const;

export type MusicTrack = (typeof MUSIC_TRACKS)[number];

export const BOARD_CHOICES = ["auto", "3d", "flat"] as const;

export type BoardSetting = (typeof BOARD_CHOICES)[number];

export interface Settings {
  music: boolean;
  musicTrack: MusicTrack;
  sounds: boolean;
  calmMotion: boolean;
  theme: ThemeSetting;
  seenTips: readonly string[];
  board: BoardSetting;
}

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  musicTrack: "both",
  sounds: true,
  calmMotion: false,
  theme: "auto",
  seenTips: [],
  board: "auto",
};

const STORAGE_KEY = "bluff.settings";

type Listener = () => void;

const THEMES: readonly ThemeSetting[] = ["auto", "day", "night"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function fromSaved(saved: Record<string, unknown>): Settings {
  const pick = <T>(value: unknown, allowed: readonly T[], fallback: T): T =>
    allowed.includes(value as T) ? (value as T) : fallback;
  const flag = (value: unknown, fallback: boolean) =>
    typeof value === "boolean" ? value : fallback;
  return {
    music: flag(saved.music, DEFAULT_SETTINGS.music),
    musicTrack: pick(saved.musicTrack, MUSIC_TRACKS, DEFAULT_SETTINGS.musicTrack),
    sounds: flag(saved.sounds, DEFAULT_SETTINGS.sounds),
    calmMotion: flag(saved.calmMotion, DEFAULT_SETTINGS.calmMotion),
    theme: pick(saved.theme, THEMES, DEFAULT_SETTINGS.theme),
    seenTips: Array.isArray(saved.seenTips)
      ? saved.seenTips.filter((tip): tip is string => typeof tip === "string")
      : DEFAULT_SETTINGS.seenTips,
    board: pick(saved.board, BOARD_CHOICES, DEFAULT_SETTINGS.board),
  };
}

function read(storage: Storage | null): Settings {
  if (!storage) return DEFAULT_SETTINGS;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    return isRecord(parsed) ? fromSaved(parsed) : DEFAULT_SETTINGS;
  } catch (error) {
    console.warn("Bluff could not read saved settings; using the defaults for now.", error);
    return DEFAULT_SETTINGS;
  }
}

export function createSettingsStore(storage: Storage | null) {
  let current = read(storage);
  const listeners = new Set<Listener>();

  return {
    get: () => current,
    getServer: () => DEFAULT_SETTINGS,
    subscribe(listener: Listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(change: Partial<Settings>) {
      current = { ...current, ...change };
      if (storage) {
        try {
          storage.setItem(STORAGE_KEY, JSON.stringify(current));
        } catch (error) {
          console.warn(
            "Bluff could not save settings; they will last until the page closes.",
            error
          );
        }
      }
      listeners.forEach((listener) => listener());
    },
  };
}

export type SettingsStore = ReturnType<typeof createSettingsStore>;

function browserStorage(): Storage | null {
  if (typeof window === "undefined") return null;
  try {
    return window.localStorage;
  } catch (error) {
    console.warn(
      "Bluff cannot use browser storage; settings will last until the page closes.",
      error
    );
    return null;
  }
}

let shared: SettingsStore | null = null;

export function settingsStore(): SettingsStore {
  shared ??= createSettingsStore(browserStorage());
  return shared;
}
