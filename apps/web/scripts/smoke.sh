#!/usr/bin/env bash
set -euo pipefail

PORT="${SMOKE_PORT:-3099}"
BASE="http://localhost:$PORT"
OPEN_ROUTES=("/" "/robots.txt" "/sitemap.xml" "/sign-in" "/design")
GUARDED_ROUTES=("/play" "/profile" "/welcome" "/table/1" "/history")
LOG="$(mktemp)"

pnpm exec next start --port "$PORT" >"$LOG" 2>&1 &
PID=$!
trap 'kill "$PID" 2>/dev/null || true; rm -f "$LOG"' EXIT

for _ in $(seq 1 60); do
  if curl -s -o /dev/null "$BASE/robots.txt"; then break; fi
  sleep 1
done

FAILED=0
for route in "${OPEN_ROUTES[@]}"; do
  status="$(curl -s -o /dev/null -w '%{http_code}' --max-time 30 "$BASE$route")"
  echo "$status $route"
  [ "$status" = "200" ] || FAILED=1
done

for route in "${GUARDED_ROUTES[@]}"; do
  expected="/sign-in?next=$(node -e 'process.stdout.write(encodeURIComponent(process.argv[1]))' "$route")"
  for cookie in "" "bluff-session=forged.not.valid"; do
    result="$(curl -s -o /dev/null -w '%{http_code} %{redirect_url}' --max-time 30 ${cookie:+-H "Cookie: $cookie"} "$BASE$route")"
    status="${result%% *}"
    location="${result#* }"
    echo "$status $route ${cookie:+(forged session) }-> ${location#$BASE}"
    if [ "$status" != "307" ] || [ "${location#$BASE}" != "$expected" ]; then FAILED=1; fi
  done
done

if [ "$FAILED" -ne 0 ]; then
  echo "Smoke test failed. Server log:"
  cat "$LOG"
  exit 1
fi
echo "The production build serves every open route and guards every game route."
