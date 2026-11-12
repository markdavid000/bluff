import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Cowrie } from "./cowrie";

const stylesheet = readFileSync(resolve(process.cwd(), "src/app/globals.css"), "utf8");
const themeBlock = /@theme inline\s*\{[^}]*\}/.exec(stylesheet)?.[0] ?? "";
const pageTokens = new Set(
  [...stylesheet.replace(themeBlock, "").matchAll(/(--[\w-]+)\s*:/g)].map(([, name]) => name)
);

describe("Cowrie", () => {
  it("paints only with colour tokens the page actually defines, in day and night", () => {
    const { container } = render(<Cowrie />);
    const used = [...container.innerHTML.matchAll(/var\((--[\w-]+)\)/g)].map(([, name]) => name);
    expect(used).toEqual(expect.arrayContaining(["--cowrie", "--cowrie-shade", "--cowrie-slit"]));
    expect(used.filter((name) => !pageTokens.has(name))).toEqual([]);
  });
});
