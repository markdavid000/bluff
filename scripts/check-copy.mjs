#!/usr/bin/env node
import { existsSync, readFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import ts from "typescript";

const COPY_FILE = /^apps\/web\/src\/.*\/copy\.ts$/;
const TECHNICAL_COPY = /^apps\/web\/src\/features\/fairness\//;
const JARGON = [
  "transaction",
  "tx",
  "gas",
  "encrypt",
  "encrypted",
  "encryption",
  "decrypt",
  "decryption",
  "ciphertext",
  "fhe",
  "blockchain",
  "onchain",
  "on-chain",
  "smart contract",
  "contract",
  "token",
  "cusdt",
  "erc-7984",
  "erc20",
  "testnet",
  "sepolia",
  "mainnet",
  "signature",
  "nonce",
  "hash",
  "revert",
  "reverted",
  "relayer",
  "mempool",
  "web3",
  "crypto",
  "eth",
  "wei",
  "dapp",
  "seed phrase",
  "private key",
];
const JARGON_PATTERN = new RegExp(`(^|[^\\w-])(${JARGON.join("|")})(?![\\w-])`, "i");
const HEX_ADDRESS = /0x[0-9a-f]{4,}/i;
const DASHES = /[–—]/;

function filesToCheck() {
  const args = process.argv.slice(2);
  const files =
    args.length > 0
      ? args
      : execFileSync("git", ["ls-files", "--cached", "--others", "--exclude-standard"], {
          encoding: "utf8",
        }).split("\n");
  return files.filter(
    (file) => existsSync(file) && COPY_FILE.test(file) && !TECHNICAL_COPY.test(file)
  );
}

function stringLiterals(source, file) {
  const sourceFile = ts.createSourceFile(file, source, ts.ScriptTarget.Latest, true);
  const literals = [];
  const visit = (node) => {
    if (ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node)) {
      literals.push({ text: node.text, start: node.getStart() });
    } else if (ts.isTemplateExpression(node)) {
      literals.push({ text: node.head.text, start: node.getStart() });
      for (const span of node.templateSpans) {
        literals.push({ text: span.literal.text, start: span.literal.getStart() });
      }
    }
    ts.forEachChild(node, visit);
  };
  visit(sourceFile);
  return literals;
}

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

const problems = [];
for (const file of filesToCheck()) {
  const source = readFileSync(file, "utf8");
  for (const literal of stringLiterals(source, file)) {
    const where = `${file}:${lineOf(source, literal.start)}`;
    const jargon = literal.text.match(JARGON_PATTERN);
    if (jargon) problems.push(`${where} "${literal.text}" uses technical word "${jargon[2]}"`);
    if (HEX_ADDRESS.test(literal.text))
      problems.push(`${where} "${literal.text}" shows a raw address`);
    if (DASHES.test(literal.text))
      problems.push(`${where} "${literal.text}" uses an em or en dash`);
  }
}

if (problems.length > 0) {
  console.error(problems.join("\n"));
  console.error(
    `\n${problems.length} wording problem(s). Player-facing text is plain language; see docs/engineering-standards.md#plain-language.`
  );
  process.exit(1);
}
