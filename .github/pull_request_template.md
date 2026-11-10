## Summary

What this changes and why. Link the issue: Closes #

## Type

- [ ] feat
- [ ] fix
- [ ] perf
- [ ] refactor
- [ ] docs, build, ci or chore

## Packages touched

- [ ] `apps/web`
- [ ] `packages/contracts`

## Decision and plan

- ADR pair: `docs/adr/...` (approved by: ) or **not required** because:
- Plan: `docs/plans/...` or **not required** because:

## Pre-review audit

- [ ] **Read first:** I read the code, callers, tests and docs for everything I changed.
- [ ] **Layers:** imports point down; features imported only through `index.ts`; no cross-feature imports; reusable UI lives in `components/shared/`.
- [ ] **Hooks:** the right hook for each job; stateful logic, effects and contract calls in custom hooks.
- [ ] **Action status:** every action reports progress through the shared status model; feedback appears within 100 ms and toasts follow the timing rules.
- [ ] **Plain language:** player-facing text lives in `copy.ts` and `pnpm copy:check` passes.
- [ ] **Confidentiality:** hidden values stay encrypted; access is granted only to the players who need it; no branching on encrypted values.
- [ ] **Contracts:** custom errors, an event per state change, tests for every revert path.
- [ ] **Tests:** behaviour tests for success, empty, loading and error states; bug fixes were red before green.
- [ ] **Money:** chip amounts in base units with `bigint`.
- [ ] **Accessibility:** keyboard, labels, contrast, reduced motion.
- [ ] **Comments:** none anywhere; `pnpm comments:check` passes.
- [ ] **Cleanup:** replaced code, assets, config and packages removed; `pnpm knip` is clean.
- [ ] **Dependencies:** any new package is used in this PR, pinned, and justified below.
- [ ] **Preflight:** `pnpm preflight` passed with zero warnings.
- [ ] **Release note:** `docs/release-notes/<date>-<topic>.md` with `scenario-impact` set.

## Removed

Code, files, config and packages this PR deletes.

## How this was verified

What you ran and what you clicked, in light and dark mode, on a phone-sized screen, signed in with Google and with an own wallet.

## Screenshots
