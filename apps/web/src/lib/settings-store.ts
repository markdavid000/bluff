type Theme = "day" | "night";

export interface Settings {
  music: boolean;
  sounds: boolean;
  calmMotion: boolean;
  theme: Theme;
}

export const DEFAULT_SETTINGS: Settings = {
  music: true,
  sounds: true,
  calmMotion: false,
  theme: "day",
};

const STORAGE_KEY = "bluff.settings";

type Listener = () => void;

function isSettings(value: unknown): value is Partial<Settings> {
  return typeof value === "object" && value !== null;
}

function read(storage: Storage | null): Settings {
  if (!storage) return DEFAULT_SETTINGS;
  try {
    const raw = storage.getItem(STORAGE_KEY);
    if (raw === null) return DEFAULT_SETTINGS;
    const parsed: unknown = JSON.parse(raw);
    if (!isSettings(parsed)) return DEFAULT_SETTINGS;
    return { ...DEFAULT_SETTINGS, ...parsed };
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
