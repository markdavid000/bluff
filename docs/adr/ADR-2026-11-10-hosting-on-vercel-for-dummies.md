# Putting the website on Vercel, in plain English

- **Status:** Approved
- **Technical version:** [ADR-2026-11-10-hosting-on-vercel.md](ADR-2026-11-10-hosting-on-vercel.md)

## What is the problem?

The website needs somewhere to live on the internet. We first picked Cloudflare, the same as the New Markets project. Both Cloudflare and Vercel are free at our size, so the choice is about convenience.

## What are we doing about it?

We move to Vercel. It is made by the same people as the website framework we use, so it needs less setup, and it creates a private test link for every change before it goes live.

## What changes for people?

Players see no difference. The team gets a test link for every change. The free plan is only for non-business projects, which fits a competition entry.

## What could go wrong?

If Bluff ever becomes a business, the free plan would no longer apply and we would need to pay or move.
