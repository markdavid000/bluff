import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const example = new URL("../.env.example", import.meta.url);
const config = readFileSync(new URL("./config.ts", import.meta.url), "utf8");

function namesIn(text: string, pattern: RegExp): string[] {
  return [...new Set([...text.matchAll(pattern)].map((match) => match[1] ?? ""))].sort();
}

describe(".env.example", () => {
  it("lists every setting the computer player reads, and nothing else", () => {
    expect(existsSync(example)).toBe(true);
    const listed = namesIn(readFileSync(example, "utf8"), /^([A-Z][A-Z0-9_]*)=/gm);
    expect(listed).toEqual(namesIn(config, /\benv\.([A-Z][A-Z0-9_]*)/g));
  });

  it("holds names only, never a value", () => {
    const lines = readFileSync(example, "utf8").split("\n").filter(Boolean);
    for (const line of lines) expect(line).toMatch(/^[A-Z][A-Z0-9_]*=$/);
  });
});
