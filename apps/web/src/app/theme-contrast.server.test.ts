import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { contrastRatio } from "@/lib/contrast";

const css = readFileSync(new URL("./globals.css", import.meta.url), "utf8");
const AA = 4.5;

function tokens(selector: RegExp): Record<string, string> {
  const block = selector.exec(css)?.[1];
  if (!block) throw new Error("A theme block is missing from globals.css.");
  return Object.fromEntries(
    [...block.matchAll(/--([\w-]+):\s*(oklch\([^)]*\))/g)].map((match) => [match[1], match[2]])
  );
}

const THEMES = {
  day: tokens(/:root\s*\{([\s\S]*?)\n\}/),
  night: tokens(/\.dark\s*\{([\s\S]*?)\n\}/),
};

const PAIRS: readonly [string, string][] = [
  ["foreground", "background"],
  ["foreground", "card"],
  ["muted-foreground", "background"],
  ["muted-foreground", "card"],
  ["muted-foreground", "muted"],
  ["tile-foreground", "tile"],
  ["seat-foreground", "seat-red"],
  ["seat-foreground", "seat-green"],
  ["seat-foreground", "seat-blue"],
  ["seat-yellow-foreground", "seat-yellow"],
  ["seat-foreground", "destructive"],
  ["seat-green-text", "card"],
  ["seat-green-text", "background"],
  ["destructive-text", "card"],
  ["destructive-text", "background"],
];

describe.each(Object.entries(THEMES))("the %s theme", (_, theme) => {
  it.each(PAIRS)("keeps %s on %s readable (WCAG AA)", (text, surface) => {
    const fore = theme[text];
    const back = theme[surface];
    if (!fore || !back) throw new Error(`Missing --${fore ? surface : text}.`);
    expect(contrastRatio(fore, back)).toBeGreaterThanOrEqual(AA);
  });
});
