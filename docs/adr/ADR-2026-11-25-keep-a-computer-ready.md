# ADR-2026-11-25: Keep a computer player ready ahead of time

- **Status:** Accepted
- **Approved by:** the maintainer, 2026-11-25
- **Companion:** [ADR-2026-11-25-keep-a-computer-ready-for-dummies.md](ADR-2026-11-25-keep-a-computer-ready-for-dummies.md)
- **Amends:** [ADR-2026-11-18-computer-player](ADR-2026-11-18-computer-player.md), section 3

## Context

On 2026-11-25 the maintainer played the computer from one account, and Baba Dice sat down. While Baba Dice waited at that table, a second account asked for the computer. Mama Dice arrived after almost two minutes.

**The cause.** ADR-2026-11-18 grows the pool on demand. When every prepared computer is busy, the request that needs a new one pays for setting it up, one step after another:

1. the bank sends the new wallet its gas money (`fund`, then a wait for the receipt);
2. the wallet saves its name and face on the faucet (`setProfile`);
3. it joins the table and marks itself ready (`joinAndReady`), as every computer does.

The service log for Mama Dice, her first game ever:

| Time (UTC) | Event                                            |
| ---------- | ------------------------------------------------ |
| 10:03:15   | `topped up`: the gas money landed                |
| 10:03:50   | `named`: name and face saved, **35 s** later     |
| 10:04:03   | `seat granted`: joined and ready, **13 s** later |

Before 10:03:15 the request also waited for the funding transaction, which isn't logged. The ADR's estimate, "a few seconds, once, for each new player", was wrong for Sepolia: setting up a new computer costs about a minute, and the player waits for all of it.

The setup happens once per wallet, and the chain keeps the name and gas between restarts. But each of the 20 wallets pays it on its first game, so the first visitor to need each one waits.

A computer that has played before also tops its gas up inside the request, whenever it's below 0.01 ETH. That's a third transaction in front of the player, now and then.

## Options considered

### Option A: keep one computer ready ahead of time (chosen)

The service keeps one idle computer that is already funded and named:

- after starting up;
- straight after it hands a computer to a table, in the background.

A request then only ever pays for the join (about 13 s measured). If two requests arrive faster than a spare can be set up, the second waits for the spare already being set up, never for a second, parallel setup.

- **Cost:** at most one computer beyond those playing holds its 0.02 ETH of test gas. Today the bank holds about 0.18 ETH.
- **Work:** the pool gains a background "prepare the next one" step and a single in-flight preparation that requests can wait on. No contract change.

### Option B: set up all 20 computers at deploy time

A script funds and names every wallet once.

- Simple, and requests never pay for setup.
- It ties up 20 × 0.02 = 0.4 ETH of test gas at once, more than the bank holds. It also has to be run again with each new secret phrase.

### Option C: make the setup faster

Send the gas money and the name in parallel, or have the bank pay for the name.

- `setProfile` is signed by the computer's own wallet and needs gas, so it can't start before the gas money lands. The bank can't set another wallet's nickname.
- It would save a few seconds at best.

### Option D: leave it

The first player to need each new computer waits about a minute longer than everyone else. Judges trying two games at once would see it.

## Decision

**Option A**, as a change to `apps/bot/src/player-pool.ts` and `main.ts`:

1. **Keep one spare.** `ensureSpare()` sets up the lowest unused wallet whenever no prepared computer is idle and none is being set up. It runs once after startup (after `resume`), and again after every `acquire`, without being awaited.
2. **One setup at a time.** A wallet being set up is marked as such. `acquire()` takes, in order:
   - an idle prepared computer;
   - otherwise the one being set up, waiting for it to finish;
   - otherwise it sets one up itself, exactly as today. That's the fallback if a background setup failed.
3. **Top up after a game, not before.** When a game ends (`release`), the bank tops that computer up in the background if it's below 0.01 ETH. `acquire` keeps its own check as a fallback, but it will rarely need to send anything.
4. **Same safety rules.**
   - Nothing is set up while the bank is below its 0.05 ETH floor.
   - The cap of 20 computers still bounds the pool.
   - A background failure is logged (`spare failed`) and retried on the next trigger. It never fails a request.
5. **New log lines:** `spare ready`, `spare failed`, and `topped up` (which already exists) for the after-game top-up.

## Diagram

```
 today                                   with a spare kept ready
 request ─► fund ─► name ─► join+ready    request ─► join+ready ─► seated   (~13 s)
            ~1 min of setup  ~13 s                   │
                                                     └─► background: fund ─► name
                                                         (the next spare, before anyone asks)

 game ends ─► (next request) top up ─► …  game ends ─► background top up
```

## Consequences

- **Better:** every request, including one for a computer that has never played, sits down in about the time of the join (13 s measured), instead of one to two minutes.
- **Costs more:** one extra wallet holds 0.02 test ETH ahead of need. The bank still needs a top-up when it nears 0.05 ETH, as before.
- **Not changed:** the HTTP API, the web app, the contracts, the seat rules, the strategy and the 20-player cap. Games running when the service restarts resume as before.
- **The amended text:** ADR-2026-11-18 section 3's "a few seconds, once" is corrected to point here.
- **Packages:** none added or removed.

## Verification

- **Vitest, in `player-pool.test.ts`:**
  - a spare is prepared after startup and after an `acquire`;
  - only one setup runs at a time;
  - an `acquire` during a setup waits for that setup rather than starting another;
  - a failed background setup is logged and doesn't break the next `acquire`;
  - nothing is set up below the bank floor;
  - a released computer below 0.01 ETH is topped up.
- **`pnpm preflight`.**
- **On Sepolia, after approval** of each live action:
  - start the service and see `spare ready`;
  - play the computer from two accounts one after the other;
  - from the log, check the second computer was seated with no `topped up` or `named` inside its request, in about the same time as the first.
