#!/usr/bin/env bash
set -euo pipefail

SOLC_VERSION="0.8.27"
WORKSPACE_MODULES="$(cd ../.. && pwd)/node_modules"
REMAPS="@fhevm/=node_modules/@fhevm/ @openzeppelin/=node_modules/@openzeppelin/ encrypted-types/=node_modules/encrypted-types/"

solc-select install "$SOLC_VERSION" >/dev/null
solc-select use "$SOLC_VERSION" >/dev/null

FILES=$(find contracts -name "*.sol" -not -path "contracts/mocks/*" -not -path "contracts/interfaces/*" | sort)
FAILED=()
for file in $FILES; do
  echo "Slither: $file"
  if ! slither "$file" \
    --solc-remaps "$REMAPS" \
    --solc-args "--optimize --optimize-runs 800 --evm-version cancun --allow-paths $WORKSPACE_MODULES" \
    --filter-paths "node_modules" \
    --fail-medium; then
    FAILED+=("$file")
  fi
done

if [ "${#FAILED[@]}" -gt 0 ]; then
  echo "Slither found medium or higher issues in: ${FAILED[*]}"
  exit 1
fi
echo "Slither: no medium or higher issues."
