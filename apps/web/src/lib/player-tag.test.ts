import { describe, expect, it } from "vitest";
import { displayName, tagOf } from "./player-tag";

const ADDRESS = "0xA020b219e476BFfdcC22b1A47392805e16893E6b";

describe("player tag", () => {
  it("is the last four characters of the address, in capitals", () => {
    expect(tagOf(ADDRESS)).toBe("#3E6B");
  });

  it("joins a nickname and the tag", () => {
    expect(displayName("Brave Otter", ADDRESS, "Player")).toBe("Brave Otter #3E6B");
  });

  it("uses the fallback when there is no nickname", () => {
    expect(displayName("", ADDRESS, "Player")).toBe("Player #3E6B");
    expect(displayName(null, ADDRESS, "Player")).toBe("Player #3E6B");
    expect(displayName("   ", ADDRESS, "Player")).toBe("Player #3E6B");
  });
});
