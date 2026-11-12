import { describe, expect, it } from "vitest";
import { isValidNickname, suggestNickname } from "./nickname";
import { seededRandom } from "./random";

describe("isValidNickname", () => {
  it.each(["Brave Otter", "abc", "Player_1", "Kola-Ade", "A".repeat(20)])("accepts %s", (name) => {
    expect(isValidNickname(name)).toBe(true);
  });

  it.each([
    ["too short", "ab"],
    ["too long", "A".repeat(21)],
    ["a leading space", " Otter"],
    ["a trailing space", "Otter "],
    ["two spaces together", "Brave  Otter"],
    ["a symbol", "Otter!"],
    ["an accent", "Adébáyọ̀"],
    ["an empty name", ""],
  ])("rejects %s", (_case, name) => {
    expect(isValidNickname(name)).toBe(false);
  });
});

describe("suggestNickname", () => {
  it("always suggests a name the game accepts", () => {
    const random = seededRandom(42);
    for (let i = 0; i < 500; i++) expect(isValidNickname(suggestNickname(random))).toBe(true);
  });

  it("never repeats the name it was asked to avoid", () => {
    const random = seededRandom(7);
    let current = suggestNickname(random);
    for (let i = 0; i < 200; i++) {
      const next = suggestNickname(random, current);
      expect(next).not.toBe(current);
      current = next;
    }
  });
});
