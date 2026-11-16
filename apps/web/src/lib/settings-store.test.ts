import { describe, expect, it, vi } from "vitest";
import { DEFAULT_SETTINGS, createSettingsStore } from "./settings-store";

function memoryStorage(): Storage {
  const data = new Map<string, string>();
  return {
    get length() {
      return data.size;
    },
    clear: () => data.clear(),
    getItem: (key) => data.get(key) ?? null,
    key: (index) => [...data.keys()][index] ?? null,
    removeItem: (key) => void data.delete(key),
    setItem: (key, value) => void data.set(key, value),
  };
}

describe("settings store", () => {
  it("starts with music and sounds on, normal motion, and the device's day or night", () => {
    expect(createSettingsStore(memoryStorage()).get()).toEqual(DEFAULT_SETTINGS);
    expect(DEFAULT_SETTINGS).toEqual({
      music: true,
      musicTrack: "both",
      sounds: true,
      calmMotion: false,
      theme: "auto",
      seenTips: [],
      board: "3d",
    });
  });

  it("remembers the chosen board", () => {
    const storage = memoryStorage();
    createSettingsStore(storage).update({ board: "flat" });
    expect(createSettingsStore(storage).get().board).toBe("flat");
  });

  it("falls back to the 3D board for a value it doesn't know, including the old automatic choice", () => {
    const storage = memoryStorage();
    storage.setItem("bluff.settings", JSON.stringify({ board: "auto" }));
    expect(createSettingsStore(storage).get().board).toBe("3d");
  });

  it("remembers which tips the player has seen", () => {
    const storage = memoryStorage();
    createSettingsStore(storage).update({ seenTips: ["wild-ones"] });
    expect(createSettingsStore(storage).get().seenTips).toEqual(["wild-ones"]);
  });

  it("keeps only the readable tip names from saved settings", () => {
    const storage = memoryStorage();
    storage.setItem("bluff.settings", JSON.stringify({ seenTips: ["wild-ones", 7, null] }));
    expect(createSettingsStore(storage).get().seenTips).toEqual(["wild-ones"]);
    storage.setItem("bluff.settings", JSON.stringify({ seenTips: "wild-ones" }));
    expect(createSettingsStore(storage).get().seenTips).toEqual([]);
  });

  it("remembers a change for the next visit", () => {
    const storage = memoryStorage();
    createSettingsStore(storage).update({ sounds: false, theme: "night" });
    expect(createSettingsStore(storage).get()).toMatchObject({ sounds: false, theme: "night" });
  });

  it("remembers the chosen music", () => {
    const storage = memoryStorage();
    createSettingsStore(storage).update({ musicTrack: "bell" });
    expect(createSettingsStore(storage).get().musicTrack).toBe("bell");
  });

  it("ignores saved values that make no sense", () => {
    const storage = memoryStorage();
    storage.setItem(
      "bluff.settings",
      JSON.stringify({ musicTrack: "opera", theme: "purple", sounds: "yes", music: false })
    );
    expect(createSettingsStore(storage).get()).toEqual({ ...DEFAULT_SETTINGS, music: false });
  });

  it("tells subscribers about a change", () => {
    const store = createSettingsStore(memoryStorage());
    const listener = vi.fn();
    store.subscribe(listener);
    store.update({ music: false });
    expect(listener).toHaveBeenCalledOnce();
    expect(store.get().music).toBe(false);
  });

  it("keeps working for the session when storage refuses to save, and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const storage = memoryStorage();
    storage.setItem = () => {
      throw new Error("quota");
    };
    const store = createSettingsStore(storage);
    store.update({ sounds: false });
    expect(store.get().sounds).toBe(false);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });

  it("falls back to the defaults when saved settings are unreadable, and warns", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const storage = memoryStorage();
    storage.setItem("bluff.settings", "{not json");
    expect(createSettingsStore(storage).get()).toEqual(DEFAULT_SETTINGS);
    expect(warn).toHaveBeenCalled();
    warn.mockRestore();
  });
});
