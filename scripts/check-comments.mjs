#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const SCRIPT_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs)$/;
const CHECKED_EXTENSIONS = /\.(ts|tsx|js|mjs|cjs|sol|css)$/;
const GENERATED = /(^|\/)(next-env\.d\.ts|types\/.*|artifacts\/.*|cache\/.*)$/;
const ALLOWED = [
  /^\/\/ SPDX-License-Identifier: [\w.-]+$/,
  /^\/\/\/ <reference (types|path)="[^"]+" \/>$/,
];

function filesToCheck() {
  const args = process.argv.slice(2);
  const files =
    args.length > 0
      ? args
      : execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
          encoding: "utf8",
        }).split("\n");
  return files.filter((file) => CHECKED_EXTENSIONS.test(file) && !GENERATED.test(file));
}

function scriptComments(source, file) {
  const kind = file.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS;
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true, kind);
  const found = new Map();
  const collect = (ranges) => {
    for (const range of ranges ?? []) {
      found.set(range.pos, { text: source.slice(range.pos, range.end), start: range.pos });
    }
  };
  const visit = (node) => {
    collect(ts.getLeadingCommentRanges(source, node.getFullStart()));
    collect(ts.getTrailingCommentRanges(source, node.getEnd()));
    for (const child of node.getChildren(sourceFile)) visit(child);
  };
  visit(sourceFile);
  return [...found.values()];
}

function solidityComments(source) {
  const scanner = ts.createScanner(
    ts.ScriptTarget.Latest,
    false,
    ts.LanguageVariant.Standard,
    source
  );
  const comments = [];
  for (let kind = scanner.scan(); kind !== ts.SyntaxKind.EndOfFileToken; kind = scanner.scan()) {
    if (
      kind === ts.SyntaxKind.SingleLineCommentTrivia ||
      kind === ts.SyntaxKind.MultiLineCommentTrivia
    ) {
      comments.push({ text: scanner.getTokenText(), start: scanner.getTokenStart() });
    }
  }
  return comments;
}

function cssComments(source) {
  return [...source.matchAll(/\/\*[\s\S]*?\*\//g)].map((match) => ({
    text: match[0],
    start: match.index,
  }));
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const problems = [];
for (const file of filesToCheck()) {
  const source = readFileSync(file, "utf8");
  const comments = file.endsWith(".sol")
    ? solidityComments(source)
    : SCRIPT_EXTENSIONS.test(file)
      ? scriptComments(source, file)
      : cssComments(source);
  for (const comment of comments) {
    if (ALLOWED.some((pattern) => pattern.test(comment.text.trim()))) continue;
    problems.push(`${file}:${lineOf(source, comment.start)} ${comment.text.split("\n")[0].trim()}`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(
    `\n${problems.length} comment(s) found. This codebase has no comments; see docs/engineering-standards.md#comments.`
  );
  process.exit(1);
}
