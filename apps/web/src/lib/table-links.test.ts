import { describe, expect, it } from "vitest";
import { parseInvite, readInviteCode, tableLink, tablePath } from "./table-links";

const CODE = 18_446_744_073_709_551_615n;
const SMALL = 98_765n;
const SMALL_LINK = tableLink("", 42n, SMALL);
const SMALL_TEXT = SMALL_LINK.slice(SMALL_LINK.indexOf("#") + 1);
const CHARACTERS = "0123456789abcdefghijklmnopqrstuvwxyz";

describe("table links", () => {
  it("puts every table on its own page", () => {
    expect(tablePath(12n)).toBe("/table/12");
    expect(tableLink("https://bluff.example", 12n)).toBe("https://bluff.example/table/12");
  });

  it("writes every code at the same length with a check on the end", () => {
    expect(SMALL_TEXT).toHaveLength(16);
    expect(SMALL_TEXT.slice(0, 13)).toBe(SMALL.toString(36).padStart(13, "0"));
    expect(tableLink("https://bluff.example", 12n, SMALL)).toBe(
      `https://bluff.example/table/12#${SMALL_TEXT}`
    );
  });

  it("catches any single character changed in the link, before a try is spent", () => {
    for (const code of [SMALL, CODE, 1n]) {
      const link = tableLink("", 42n, code);
      const text = link.slice(link.indexOf("#") + 1);
      expect(parseInvite(link)).toEqual({ id: 42n, code });
      for (let position = 0; position < text.length; position++) {
        for (const character of CHARACTERS) {
          if (character === text[position]) continue;
          const edited = text.slice(0, position) + character + text.slice(position + 1);
          expect(parseInvite(`/table/42#${edited}`), edited).toBeNull();
        }
      }
    }
  });

  it("carries a private table's code after the #, where it never reaches a server", () => {
    expect(tableLink("https://bluff.example", 182915736201844n, CODE)).toMatch(
      new RegExp(`^https://bluff\\.example/table/182915736201844#${CODE.toString(36)}[0-9a-z]{3}$`)
    );
    expect(tableLink("https://bluff.example", 12n, null)).toBe("https://bluff.example/table/12");
  });

  it.each([
    ["https://bluff.example/table/12", 12n],
    ["http://localhost:3002/table/7?from=invite", 7n],
    ["/table/42", 42n],
    ["https://bluff.example/table/9/", 9n],
    ["https://bluff.example/table/182915736201844", 182915736201844n],
    ["  42 ", 42n],
    ["#9", 9n],
  ])("reads %s", (input, id) => {
    expect(parseInvite(input)).toEqual({ id, code: null });
  });

  it("reads the code from a pasted private link", () => {
    expect(parseInvite(tableLink("https://bluff.example", 42n, CODE))).toEqual({
      id: 42n,
      code: CODE,
    });
    expect(parseInvite(`/table/42#${SMALL_TEXT}`)).toEqual({ id: 42n, code: SMALL });
  });

  it.each([
    "",
    "0",
    "/table/0",
    "-3",
    "abc",
    "https://bluff.example/play",
    "https://bluff.example/table/x",
    "https://bluff.example/tables/12",
    "1e3",
    "1234567890123456",
    "/table/281474976710656",
  ])("rejects %s", (input) => {
    expect(parseInvite(input)).toBeNull();
  });

  it("rejects a link whose code is damaged, shortened or lengthened", () => {
    expect(parseInvite("/table/42#not-a-code!")).toBeNull();
    expect(parseInvite(`/table/42#${SMALL_TEXT.slice(0, 10)}`)).toBeNull();
    expect(parseInvite(`/table/42#${SMALL_TEXT}0`)).toBeNull();
    expect(parseInvite(`/table/42#${(CODE + 1n).toString(36)}000`)).toBeNull();
  });

  describe("on the table page", () => {
    it("reads the code from the address's #", () => {
      const link = tableLink("", 1n, CODE);
      expect(readInviteCode(link.slice(link.indexOf("#")))).toBe(CODE);
      expect(readInviteCode(`#${SMALL_TEXT}`)).toBe(SMALL);
    });

    it.each(["", "#", "#K3X9!", "#zzzzzzzzzzzzzz", "#k3x9", `#${"0".repeat(12)}`])(
      "finds no code in %j",
      (hash) => {
        expect(readInviteCode(hash)).toBeNull();
      }
    );
  });
});
