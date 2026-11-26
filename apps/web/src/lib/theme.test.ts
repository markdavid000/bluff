import { describe, expect, it } from "vitest";
import { THEME_BOOT_SCRIPT, isNight } from "./theme";

describe("isNight", () => {
  it("follows the device until the player chooses", () => {
    expect(isNight("auto", true)).toBe(true);
    expect(isNight("auto", false)).toBe(false);
  });

  it("keeps the player's own choice whatever the device says", () => {
    expect(isNight("night", false)).toBe(true);
    expect(isNight("day", true)).toBe(false);
  });
});

describe("the theme set before the page draws", () => {
  function boot(saved: string | null, deviceIsDark: boolean) {
    document.documentElement.className = "";
    window.localStorage.clear();
    if (saved !== null) window.localStorage.setItem("bluff.settings", saved);
    window.matchMedia = (query: string) =>
      ({ matches: deviceIsDark && query.includes("dark") }) as MediaQueryList;
    new Function(THEME_BOOT_SCRIPT)();
    return document.documentElement.classList.contains("dark");
  }

  it("matches the device when nothing is saved", () => {
    expect(boot(null, true)).toBe(true);
    expect(boot(null, false)).toBe(false);
  });

  it("uses the saved choice", () => {
    expect(boot(JSON.stringify({ theme: "night" }), false)).toBe(true);
    expect(boot(JSON.stringify({ theme: "day" }), true)).toBe(false);
  });

  it("falls back to the device and warns when the saved settings are unreadable", () => {
    const warn = console.warn;
    let warned = false;
    console.warn = () => {
      warned = true;
    };
    expect(boot("{broken", true)).toBe(true);
    console.warn = warn;
    expect(warned).toBe(true);
  });

  it("calms the page before it draws when the player chose calm motion", () => {
    boot(JSON.stringify({ calmMotion: true }), false);
    expect(document.documentElement).toHaveClass("calm");
    boot(JSON.stringify({ calmMotion: false }), false);
    expect(document.documentElement).not.toHaveClass("calm");
    boot(null, false);
    expect(document.documentElement).not.toHaveClass("calm");
  });

  it("still sets the theme when browser storage cannot be reached", () => {
    const storage = Object.getOwnPropertyDescriptor(window, "localStorage");
    const warn = console.warn;
    console.warn = () => undefined;
    document.documentElement.className = "";
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new Error("blocked");
      },
    });
    window.matchMedia = (query: string) => ({ matches: query.includes("dark") }) as MediaQueryList;
    new Function(THEME_BOOT_SCRIPT)();
    if (storage) Object.defineProperty(window, "localStorage", storage);
    console.warn = warn;
    expect(document.documentElement).toHaveClass("dark");
    expect(document.documentElement).not.toHaveClass("calm");
  });
});
