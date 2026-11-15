#!/usr/bin/env bash
set -euo pipefail

MODE="${1:-full}"
BLUE='\033[0;34m'
GREEN='\033[0;32m'
NC='\033[0m'

step() {
  echo -e "\n${BLUE}[$1] $2${NC}"
}

WANTED_NODE="$(tr -d 'v[:space:]' < .nvmrc)"
RUNNING_NODE="$(node -p 'process.versions.node.split(".")[0]')"
if [ "$RUNNING_NODE" != "$WANTED_NODE" ]; then
  echo "This project runs on Node $WANTED_NODE (see .nvmrc), but this is Node $RUNNING_NODE." >&2
  echo "Run it through pnpm, which uses the Node set in package.json, or switch to Node $WANTED_NODE." >&2
  exit 1
fi

step "1/10" "Format"
pnpm format:check

step "2/10" "Comments"
pnpm comments:check

step "3/10" "Plain-language copy"
pnpm copy:check

step "4/10" "Compile contracts"
pnpm compile

step "5/10" "Lint (ESLint and solhint)"
pnpm lint

step "6/10" "Typecheck"
pnpm typecheck

step "7/10" "Tests (Vitest and Hardhat)"
pnpm test

step "8/10" "Unused files, exports and dependencies"
pnpm knip

if [ "$MODE" = "--fast" ]; then
  echo -e "\n${GREEN}Fast preflight passed. The production build and smoke test run in CI and in a full preflight.${NC}"
  exit 0
fi

step "9/10" "Production build (clean)"
rm -rf apps/web/.next
pnpm build

step "10/10" "Smoke test (production server)"
pnpm --filter @bluff/web smoke

echo -e "\n${GREEN}All preflight gates passed.${NC}"
