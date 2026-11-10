# Letting anyone sign in and play without a crypto wallet, in plain English

- **Status:** Approved, pending a test on the practice network
- **Technical version:** [ADR-2026-11-10-onboarding-with-privy.md](ADR-2026-11-10-onboarding-with-privy.md)

## What is the problem?

Most people do not have a crypto wallet, and even those who do would need special test money to pay a small fee on every single move. That puts most players, and the competition judges, off before the first roll.

## What are we doing about it?

Players sign in with Google or their email, like any other website. A service called Privy quietly creates a wallet for them in the background. We pay the small fees on their behalf, so they never need test money. People who already have a wallet can still use it.

Before we commit to this, we will run a small test to make sure Privy's wallets work with Zama's hidden-dice technology, because the dice are tied to each player's wallet.

## What changes for people?

New players go from the front page to rolling dice in about half a minute. Players using Google or email never see a wallet pop-up. We take on one outside service for sign-in, which is free at our size.

## What could go wrong?

The test might show that paying fees on players' behalf does not work with Zama yet. If so, we keep Google and email sign-in and add a simple button that sends new players free practice money instead.
