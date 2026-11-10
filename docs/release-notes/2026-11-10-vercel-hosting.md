---
date: 2026-11-10
branch: build/vercel-hosting
base: dev
scenario-impact: none
---

# Hosting moves from Cloudflare to Vercel

The web app is now built as a standard Next.js app for Vercel. Players see no difference; every pull request will get its own preview link once the repository is connected to Vercel.

## Changes

- CI and preflight build with `pnpm build` and run a smoke test that starts the production server and requires a 200 on every route.
- `siteConfig.url` reads Vercel's production host at build time and falls back to `http://localhost:3000`.
- Architecture, contributing, agent, security and standards docs describe Vercel deployment and secrets.

## Removed

- `@opennextjs/cloudflare` and `wrangler`.
- `apps/web/wrangler.jsonc`, `apps/web/open-next.config.ts`, `apps/web/.dev.vars.example`, `apps/web/scripts/worker-smoke.sh`.
- The `build:cloudflare`, `smoke:worker`, `preview:cloudflare` and `deploy:cloudflare` scripts.
- The Cache Components restriction, which only applied to Cloudflare Workers.

## Verification

- `pnpm preflight` passes, including the production build and smoke test.
