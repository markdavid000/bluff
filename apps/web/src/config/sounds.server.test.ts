import { existsSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { SOUNDS } from "./sounds";

describe("SOUNDS", () => {
  it.each(Object.entries(SOUNDS))("ships the file for %s", (_, sound) => {
    expect(existsSync(new URL(`../../public${sound.url}`, import.meta.url))).toBe(true);
  });

  it("has a sound for each moment the game marks", () => {
    expect(Object.keys(SOUNDS)).toEqual(
      expect.arrayContaining(["settle", "thud", "tick", "celebration"])
    );
  });
});
