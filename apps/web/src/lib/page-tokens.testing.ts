import { readFileSync } from "node:fs";
import { resolve } from "node:path";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const themeBlock = /@theme inline\s*\{[^}]*\}/.exec(stylesheet)?.[0] ?? "";
const definedTokens = new Set(
  [...stylesheet.replace(themeBlock, "").matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name)
);

export function tokensUsedIn(html: string): string[] {
  return [...html.matchAll(/var\((--[\w-]+)/g)]
    .map(([, name]) => name)
    .filter((name): name is string => Boolean(name));
}

export function undefinedTokensIn(html: string): string[] {
  return tokensUsedIn(html).filter((name) => !definedTokens.has(name));
}
