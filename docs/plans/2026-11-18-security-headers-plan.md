# Plan: basic security headers

Builds [ADR-2026-11-18-security-headers](../adr/ADR-2026-11-18-security-headers.md), approved by the maintainer on 2026-11-18.

## Files

- **New `apps/web/src/config/security-headers.ts`:** the header list, tested first.
- **`apps/web/next.config.ts`:** `async headers()` serves the list for `/(.*)`.
- **`apps/web/scripts/smoke.sh`:** checks the headers on the production server.
- **Docs:** the release note.

## Removed

Nothing.
