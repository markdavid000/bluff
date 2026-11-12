import { readFileSync, readdirSync, statSync } from "node:fs";
import { join, relative, resolve } from "node:path";
import ts from "typescript";
import { describe, expect, it } from "vitest";

const SOURCE = resolve(process.cwd(), "src");
const PICTURE_IS_THE_ICON = new Set(["features/account/components/player-badge.tsx"]);
const SHOWCASE = "features/design/";

function componentFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name);
    if (statSync(path).isDirectory()) return componentFiles(path);
    return path.endsWith(".tsx") && !path.endsWith(".test.tsx") ? [path] : [];
  });
}

function buttonsWithoutIcon(path: string): number[] {
  const file = ts.createSourceFile(
    path,
    readFileSync(path, "utf8"),
    ts.ScriptTarget.Latest,
    true,
    ts.ScriptKind.TSX
  );
  const lines: number[] = [];
  function visit(node: ts.Node) {
    if (
      (ts.isJsxOpeningElement(node) || ts.isJsxSelfClosingElement(node)) &&
      node.tagName.getText(file) === "ActionButton"
    ) {
      const hasIcon = node.attributes.properties.some(
        (attribute) => ts.isJsxAttribute(attribute) && attribute.name.getText(file) === "icon"
      );
      if (!hasIcon) lines.push(file.getLineAndCharacterOfPosition(node.getStart(file)).line + 1);
    }
    ts.forEachChild(node, visit);
  }
  visit(file);
  return lines;
}

describe("ActionButton icons", () => {
  it("gives every button in the game an icon", () => {
    const missing = componentFiles(SOURCE)
      .map((path) => relative(SOURCE, path))
      .filter((path) => !PICTURE_IS_THE_ICON.has(path) && !path.startsWith(SHOWCASE))
      .flatMap((path) => buttonsWithoutIcon(join(SOURCE, path)).map((line) => `${path}:${line}`));
    expect(missing).toEqual([]);
  });
});
