import { describe, expect, it } from "vitest";
import { avatarSource, defaultAvatarFor, isPresetAvatar } from "./avatar";

const ADDRESS = "0xA020b219e476BFfdcC22b1A47392805e16893E6b";

describe("avatars", () => {
  it("knows the twelve preset faces", () => {
    expect([0, 1, 12, 13, 1.5].map(isPresetAvatar)).toEqual([false, true, true, false, false]);
  });

  it("picks the same face from an address every time, whatever its case", () => {
    expect(defaultAvatarFor(ADDRESS)).toBe(defaultAvatarFor(ADDRESS.toLowerCase()));
    expect(isPresetAvatar(defaultAvatarFor(ADDRESS))).toBe(true);
  });

  it("spreads players across every face", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 2000; i++)
      seen.add(defaultAvatarFor(`0x${i.toString(16).padStart(40, "0")}`));
    expect(seen.size).toBe(12);
  });

  it("shows the chosen face, or the address's face when none was chosen", () => {
    expect(avatarSource(7, ADDRESS)).toBe("/avatars/7.svg");
    expect(avatarSource(0, ADDRESS)).toBe(`/avatars/${defaultAvatarFor(ADDRESS)}.svg`);
  });
});
