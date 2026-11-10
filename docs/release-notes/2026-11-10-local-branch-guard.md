---
date: 2026-11-10
branch: chore/local-branch-guard
base: dev
scenario-impact: none
---

# Local branch guard: dev, staging and main are locked on your machine

GitHub only enforces branch protection on private repositories with a paid plan. Until Bluff is public, commits straight to `dev`, `staging` or `main` are refused locally, and VS Code shows a lock on those branches.

## Changes

- A `branch guard` job in the Lefthook pre-commit hook.
- `.vscode/settings.json` with `git.branchProtection` for the three branches.
- CONTRIBUTING explains why both exist.

## Removed

- Nothing.

## Verification

- A commit on this feature branch passes the guard; a commit attempted on `dev` is refused.
