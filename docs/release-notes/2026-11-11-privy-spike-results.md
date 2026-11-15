---
date: 2026-11-11
branch: docs/privy-spike-results
base: dev
scenario-impact: none
---

# Privy and Zama spike results

The Sepolia spike from the onboarding ADR passed: Google and email sign-in, a sponsored move with no ETH in the player's wallet, decrypting a hidden value as its owner, and a public reveal verified onchain.

## Changes

- The onboarding ADR records the results, timings and lessons, and its status moves to "spike passed".
- Engineering standards: decryptions retry for up to 30 seconds to ride out Zama's gateway propagation; contract functions never use `Object.prototype` names such as `valueOf`.

## Removed

- Nothing.

## Verification

- Three spike runs on Sepolia; results recorded in the ADR. The spike code was throwaway and was not kept; the shipped app replaces it.
