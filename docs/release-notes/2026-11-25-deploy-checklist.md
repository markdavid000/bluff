---
date: 2026-11-25
branch: fix/staging-site-and-checklist
base: dev
scenario-impact: none
---

# A deploy checklist, and staging that knows it's staging

Batch 7 of the 2026-11-25 review plan. **No contract change, no new package.**

## Changes

- **`docs/deploy-checklist.md`,** linked from CONTRIBUTING, lists everything set by hand for staging and production:
  - the addresses;
  - Vercel's four variables per environment;
  - Privy's allowed origins and the computer service's `ALLOWED_ORIGINS`;
  - Google sign-in, the computer service and the contracts;
  - the checks to do by hand after each deploy.
- **The site address follows the environment** (`config/site.ts`). Production uses its own address. Staging and previews use theirs (`VERCEL_BRANCH_URL`, then `VERCEL_URL`), so staging's canonical links, share image and sitemap no longer point at production.
- **`robots.txt`** lets search engines in on production only. Staging and previews say `Disallow: /`.

## Verification

- **Vitest:** red first for the site address per environment and for robots on production and on staging; all web tests pass.
- **`pnpm preflight`.**
