---
date: 2026-11-10
branch: chore/project-foundation
base: dev
scenario-impact: none
---

# Project foundation: the Bluff workspace, tooling and docs

Bluff now has its repository: the web app and the contracts side by side, the same structure and gates as New Markets, and the documents every contributor reads first. Players see a front page that explains the game.

## Changes

- pnpm workspace with `apps/web` (Next.js on Cloudflare Workers) and `packages/contracts` (Hardhat 2 with the Zama FHEVM plugin).
- ESLint architecture boundaries with a new `components/shared/` layer, and a rule that keeps text out of JSX.
- Checks for zero comments and for plain-language player text, run on commit and in CI.
- CI: branch flow, format, comments, copy, compile, lint, typecheck, knip, tests, Cloudflare build, Worker smoke test, gitleaks.
- Docs: README, CONTRIBUTING, AGENTS, SECURITY, architecture, engineering standards, ADR templates, plans, release notes.
- Proposed ADR pairs: project foundation, client state and action feedback, onboarding with Privy, game rules.

## Removed

- Nothing; this is the first change.

## Verification

- Landing page tests pass; the Worker serves `/`, `/robots.txt` and `/sitemap.xml` with 200.
- Solidity lint passes once the first contract lands.
