#!/usr/bin/env bash
set -euo pipefail

OUTPUT="$(env -i PATH="$PATH" node dist/main.js 2>&1 || true)"
if echo "$OUTPUT" | grep -q "The computer player can't start"; then
  echo "bot smoke ok: the bundle loads and refuses to start without its settings"
else
  echo "bot smoke failed:"
  echo "$OUTPUT"
  exit 1
fi
