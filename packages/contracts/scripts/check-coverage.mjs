#!/usr/bin/env node
import { readFileSync } from "node:fs";

const THRESHOLDS = { lines: 95, branches: 90 };
const summary = JSON.parse(readFileSync("coverage/coverage-summary.json", "utf8")).total;

const failures = Object.entries(THRESHOLDS)
  .filter(([metric, minimum]) => summary[metric].pct < minimum)
  .map(([metric, minimum]) => `${metric}: ${summary[metric].pct}% is below ${minimum}%`);

for (const [metric] of Object.entries(THRESHOLDS)) {
  console.log(`${metric}: ${summary[metric].pct}%`);
}

if (failures.length > 0) {
  console.error(`\nContract coverage is too low:\n${failures.join("\n")}`);
  process.exit(1);
}
