# ADR-2026-11-10: Hosting on Vercel

- **Status:** Approved
- **Approved by:** (MarkDavid, 10th Nov 2026)
- **Supersedes:** the hosting part of [ADR-2026-11-10-project-foundation.md](ADR-2026-11-10-project-foundation.md)
- **Companion:** [ADR-2026-11-10-hosting-on-vercel-for-dummies.md](ADR-2026-11-10-hosting-on-vercel-for-dummies.md)

## Context

The project foundation chose Cloudflare Workers through OpenNext, copying New Markets. The owner prefers Vercel. Both have a free tier that covers a competition entry:

- Cloudflare Workers Free: 100,000 requests a day; New Markets already runs on it.
- Vercel Hobby: free for personal, non-commercial projects; Bluff is a competition entry, not a business.

Bluff has no server-side data: game state is read in the browser from the contract. Hosting serves the pages and the scripts, nothing more.

## Options considered

### Cloudflare Workers via OpenNext

Free and proven in New Markets. Needs the OpenNext adapter, Wrangler, a Worker smoke test, and a rule against Cache Components because they deadlock on Workers with Next.js 16.3 and later.

### Vercel

Built by the makers of Next.js, so every Next.js feature works without an adapter. A preview deployment for every pull request and branch, which judges and testers can open. The Hobby plan forbids commercial use; moving to Pro or another host would be needed if Bluff became a business.

## Decision

Host the web app on Vercel, Hobby plan, connected to the GitHub repository.

- Production deploys from `main`.
- `staging` deploys to a fixed preview URL used for testing.
- Every pull request gets its own preview deployment.
- Remove OpenNext, Wrangler, `wrangler.jsonc`, `open-next.config.ts`, `.dev.vars.example`, `worker-smoke.sh` and their scripts.
- CI keeps a build gate: `next build`, then a smoke test that starts the production server with `next start` and requires a 200 on every route, so a broken build still fails the `quality` check before Vercel sees it.
- The Cache Components restriction is lifted from the architecture document; using them is still a separate decision.

## Diagram

```
 GitHub ── pull request ──► CI (quality) ──► merge
   │                                           │
   │                    ┌──────────────────────┤
   ▼                    ▼                      ▼
 Vercel preview     Vercel staging URL     Vercel production
 (every PR)         (staging branch)       (main branch)
```

## Consequences

- Simpler setup: no adapter, no Worker runtime differences.
- Preview links on every pull request, useful for review and for the demo.
- Packages removed: `@opennextjs/cloudflare`, `wrangler`.
- Commercial use would need a paid plan or a move.
- The owner connects the repository in the Vercel dashboard once; the app needs no secrets at deploy time.

## Verification

CI's build and smoke test pass. A pull request shows a Vercel preview link that serves the landing page.
