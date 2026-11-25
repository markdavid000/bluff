---
date: 2026-11-25
branch: build/computer-on-fly
base: dev
scenario-impact: none
---

# The computer player moves to Fly.io

Builds the approved [ADR-2026-11-25-computer-on-fly](../adr/ADR-2026-11-25-computer-on-fly.md). Railway's trial had ended. **No code change, no contract change, no new package.**

## Changes

- **`apps/bot/Dockerfile`**, built from the repository root:
  - installs the workspace with `--frozen-lockfile --ignore-scripts` (there's no git in the build for `lefthook`);
  - compiles the contracts' ABIs and bundles the service;
  - ships only the bot's production dependencies (`pnpm deploy --prod --legacy`) on `node:24-slim`, as the `node` user.
- **`apps/bot/fly.toml`:**
  - port 8080, HTTPS forced;
  - never stops (`auto_stop_machines = "off"`, `min_machines_running = 1`);
  - a `/health` check, restart policy `always`, rolling deploys, and `SIGTERM` with 30 s to stop;
  - a 512 MB `shared-cpu-1x` machine.

  There are no secrets and no app name in the file; the app is named at deploy.

- **`.dockerignore`** keeps every `.env` file, `node_modules`, build output and worktrees out of the build.
- **Docs:**
  - the architecture doc's hosting section;
  - CONTRIBUTING's deploy steps, with the one-machine rule;
  - ADR-2026-11-18's amendment links and its "staying awake on Railway" section.

## Verification

- **`pnpm preflight`.**
- **The image build and the first deploy** are checked with the maintainer: `docker build` (or Fly's builder), then `fly status` shows one machine passing `/health`, then a game against the computer from `localhost:3002`.
