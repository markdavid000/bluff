---
date: 2026-11-10
branch: chore/dependabot-ignores
base: dev
scenario-impact: none
---

# Dependabot stops proposing upgrades that cannot work yet

Dependabot opened major-version upgrades that break the build. It now leaves those packages on their current major versions.

## Changes

- Major updates ignored for the Hardhat 2 toolchain (`hardhat`, `@nomicfoundation/*`, `hardhat-deploy`, `chai`, `@types/chai`), which the Zama FHEVM plugin requires.
- Major updates ignored for `typescript` (Next.js and typescript-eslint do not support TypeScript 7 yet), `eslint` and `@eslint/js` (the Next.js ESLint config is on ESLint 9), and `@types/node` (the project runs on Node 24).
- Minor and patch updates still arrive weekly.
- Dependabot watches the workspace root only. The root covers both packages and their shared lockfile; listing `apps/web` and `packages/contracts` separately produced duplicate pull requests without lockfile updates.

## Removed

- Nothing.

## Verification

- The next Dependabot run opens no major-version pull requests for these packages.
