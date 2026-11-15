import { describe, expect, it } from "vitest";
import { DEFAULT_AFTER_SIGN_IN, safeNextPath } from "./safe-redirect";

describe("safeNextPath", () => {
  it("keeps a page on this site, with its query", () => {
    expect(safeNextPath("/play")).toBe("/play");
    expect(safeNextPath("/table/12?seat=2")).toBe("/table/12?seat=2");
  });

  it("keeps the invite part of a link after the #", () => {
    expect(safeNextPath("/table/12#abc123")).toBe("/table/12#abc123");
  });

  it.each([
    ["nothing", undefined],
    ["an empty value", ""],
    ["another site", "https://evil.example"],
    ["a protocol-relative link", "//evil.example/play"],
    ["a backslash trick", "/\\evil.example"],
    ["a script link", "javascript:alert(1)"],
    ["a relative path", "play"],
    ["a control character", "/play\nSet-Cookie: x=1"],
  ])("sends %s to the lobby", (_case, value) => {
    expect(safeNextPath(value)).toBe(DEFAULT_AFTER_SIGN_IN);
  });
});
