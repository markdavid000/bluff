import { afterEach, describe, expect, it } from "vitest";
import { rememberGames, rememberedGames } from "./remembered-games";

const ME = "0x0000000000000000000000000000000000001a2b";

afterEach(() => window.localStorage.clear());

describe("remembered games", () => {
  it("gives back what was saved for that player only", () => {
    rememberGames(ME, {
      searchedTo: 500n,
      joins: [{ id: 3n, block: 90n }],
      lefts: [{ id: 3n, block: 95n }],
    });
    expect(rememberedGames(ME.toUpperCase().replace("0X", "0x"))).toEqual({
      searchedTo: 500n,
      joins: [{ id: 3n, block: 90n }],
      lefts: [{ id: 3n, block: 95n }],
    });
    expect(rememberedGames("0x0000000000000000000000000000000000003c4d")).toBeNull();
  });

  it("starts over when what was saved can't be read", () => {
    window.localStorage.setItem(`bluff:games:${ME}`, "{not json");
    expect(rememberedGames(ME)).toBeNull();
    window.localStorage.setItem(`bluff:games:${ME}`, JSON.stringify({ searchedTo: "x", joins: 4 }));
    expect(rememberedGames(ME)).toBeNull();
  });
});
