# ADR-2026-11-10: Client state and action feedback

- **Status:** Approved
- **Approved by:** (MarkDavid, 10th Nov 2026)
- **Companion:** [ADR-2026-11-10-client-state-and-action-feedback-for-dummies.md](ADR-2026-11-10-client-state-and-action-feedback-for-dummies.md)

## Context

Almost all of Bluff's state lives in the contract: tables, players, turns, bids, dice counts, chip balances. It changes when any player acts, and every player's screen must follow within moments. Player actions are slow by nature: a Sepolia block is about 12 seconds, and a public reveal adds a relayer round trip. The owner's requirement is that feedback appears and leaves at the right moment and the app never feels stuck.

The Zama React SDK (`@zama-fhe/react-sdk` 3.7.x) is built on TanStack Query and integrates with wagmi, which is itself built on TanStack Query.

## Options considered

### State

- **Redux Toolkit.** A general store, but the data is remote; we would rebuild caching, refetching and invalidation that TanStack Query already provides.
- **Zustand.** Small and pleasant for client-only state; Bluff has very little client-only state that crosses components.
- **React Context.** Fine for providers; re-renders every consumer on change and has no cache.
- **TanStack Query (through wagmi and the Zama SDK).** One cache for contract reads, encrypted reads and reveals; keys, invalidation, polling, optimistic updates, `keepPreviousData`. Already required by both SDKs.

### Feedback

- **Each feature handles its own pending and error state.** Inconsistent messages and timings; duplicated logic.
- **One action status model and one `notify` module.** Every action reports the same statuses; every toast follows the same timing rules.

## Decision

- **TanStack Query is the only store for remote state**, used through wagmi read hooks, the Zama React SDK hooks and feature `queryOptions` factories. Components reach it only through named feature hooks.
- **Live updates come from contract events.** Feature hooks watch events with `useWatchContractEvent` and apply the change with `setQueryData`; a slow `refetchInterval` remains as a fallback.
- **Local UI state** uses `useState` or `useReducer` inside feature hooks. Zustand is added only if client-only state must cross routes, through its own ADR. No Redux.
- **One action status model** in `src/hooks/`: `idle`, `preparing`, `confirming`, `sending`, `waiting`, `done`, `failed`, with the reason translated from wallet, contract and relayer errors by one translator in `src/lib/`.
- **Player-facing timing rules:** response within 100 ms; working messages appear after 300 ms and stay at least 500 ms; one message per action; a "network is busy" note after 15 seconds; own moves shown optimistically and rolled back on failure.
- **Toasts** use Sonner through one `notify` module: one toast per action updated in place, success about 3 seconds, info about 4, errors until dismissed with Try again, at most three visible, duplicates collapsed. Inline problems stay inline.
- **Warm-up:** the Zama SDK's WASM starts loading in the lobby.

## Diagram

```
 contract event ──► useWatchContractEvent ──► setQueryData ──┐
                                                             ▼
 feature hook ──► useQuery / wagmi / Zama SDK ──► QueryClient cache ──► component
      │                                                      ▲
      ▼                                                      │ invalidate / rollback
 useAction (status model) ──► notify (one toast, in place) ──┘
      │
      └─► wallet ─► Sepolia ─► receipt ─► done | failed (translated reason)
```

## Consequences

- One mental model for every screen; no hand-written fetching effects.
- Toast and status behaviour is identical everywhere and testable in one place.
- Packages added when the first feature uses them: `wagmi`, `viem`, `@tanstack/react-query`, `@tanstack/eslint-plugin-query`, `@zama-fhe/sdk`, `@zama-fhe/react-sdk`, `sonner`.
- The Zama SDK is browser-only; providers live in a client providers file in the game route group, and the landing page does not load them.

## Verification

Hook tests with `renderHook` and a test `QueryClient` cover loading, success, error and an event-driven update. The action status hook has tests for every transition and for the 300 ms and 500 ms timing rules with fake timers. A manual check on Sepolia confirms an opponent's bid appears without a page refresh.
