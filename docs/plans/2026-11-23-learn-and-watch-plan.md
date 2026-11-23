# Plan: learn and watch (PR 6)

Builds PR 6 of the [web app plan](2026-11-11-web-app-plan.md#9-build-order): "Watching, `/fairness`, `/how-to-play`, the landing page with the tumbling die and tilting cards, metadata". Usable result: anyone can watch a game and learn why it is fair.

It follows the approved ADRs, with no new decision:

- [The web app](../adr/ADR-2026-11-11-web-app.md): routes, and watchers never send keeper moves;
- [Game flow and timing](../adr/ADR-2026-11-10-game-flow-and-timing.md#watching): watching is read-only, with bids, dice counts and reveals, never hidden dice;
- [Route protection](../adr/ADR-2026-11-12-route-protection.md): `/`, `/how-to-play` and `/fairness` are public; watching a table needs sign-in;
- [Look, feel and sound](../adr/ADR-2026-11-11-look-feel-and-sound.md): the tumbling die, tilting cards, pattern frames and the board peeking in.

**No contract change, no new dependency.**

## What exists today

- **`/`:** a title and two lines. There is no way into the game from it.
- **`/how-to-play` and `/fairness`:** don't exist. The rules live only in `docs/how-to-play.md`.
- **Watching:** doesn't exist. Someone who isn't seated at a game in progress falls into the waiting room's visitor view.
- **Listing games in progress:** the contract's `openTables` lists only waiting tables, so they have to be found another way.
- **Metadata:** only a site-wide title and description, with no share image.
- **Already built and reusable:** `TumblingDie`, `RaisedCard`, `PatternFrame`, `StreetBackdrop`, `DieFace`, `ActionButton`.

## Pull requests

Three, each usable on its own and each through `pnpm preflight`:

| PR      | Delivers                                                                                                                 | Usable result                                        |
| ------- | ------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------- |
| **6-1** | `/how-to-play` and `/fairness`: public, server-rendered, no game code loaded                                             | Anyone can read the rules and why the game is fair   |
| **6-2** | The landing page (tumbling die, three tilting cards, a way in) and metadata (titles, descriptions, share image, sitemap) | The front door looks like the game and leads into it |
| **6-3** | Watching: "Games being played" in the lobby, and a read-only table view                                                  | Anyone signed in can follow a live game              |

## 6-1: `/how-to-play` and `/fairness`

- **Routes:** `app/how-to-play/page.tsx` and `app/fairness/page.tsx`, outside `(game)`, so they are public and load no Privy, wagmi or Zama code. Each sets its own title and description.
- **`features/rules`:** `HowToPlay`, with its text in `copy.ts`. It's the same content as `docs/how-to-play.md`, laid out as raised cards:
  - **The idea**;
  - **Your dice**: the 2, 3 and 4-player table, with `DieFace` pips;
  - **Ones are wild**: a small visual of ones counting;
  - **Your turn**: raise or call, with the "at least" example drawn with dice;
  - **When a bluff is called**;
  - **Winning** and the 15-minute clock;
  - **Time and leaving**.
- **`features/fairness`:** `FairnessPage`. It's the one place technical words are allowed (standards, Plain language). Each claim is one plain line, followed by the detail for the curious:
  1. **Nobody can see your dice, not even us.** Each die is an encrypted `euint8` rolled on-chain with `FHE.randEuint16()`, and only the game contract and the player who rolled it are given access (`FHE.allowThis`, `FHE.allow`). Whoever deployed the contracts has no access, and `confidentiality.test.ts` proves it.
  2. **The roll can't be rigged.** The randomness comes from Zama's FHE coprocessor inside the transaction, not from a server or from the players.
  3. **A call reveals everyone, and the reveal is proven.** Calling a bluff makes every die publicly decryptable. The result is accepted only with Zama's signed decryption proof (`FHE.checkSignatures`), so nobody can fake the dice shown.
  4. **The computer plays by the same rules.** It reads only its own dice through the same protocol, and the relayer refused it another player's die when tested.
  5. **Chips stay private too.** Balances and payments are encrypted, readable only by their owner and the cashier.
  6. **Check it yourself:**
     - links to every contract on Etherscan, verified source;
     - the confidentiality tests;
     - the repository.
- **Links in:** "How to play" and "Why it's fair" join the landing page (6-2) and the lobby, as quiet links under the buttons.
- **Docs:** `docs/how-to-play.md` stays the source text. The page copies its wording into `copy.ts`, and the doc says the page mirrors it.
- **Tests:** each page renders its sections and headings in order; every Etherscan link points at the addresses in `sepoliaDeployment`, so a redeploy can't leave a stale link; `copy:check` passes; both routes are public in `route-guard`.

```
 /fairness (phone)
┌──────────────────────────────┐
│ ▓▓ pattern frame ▓▓▓▓▓▓▓▓▓▓▓ │
│  Why Bluff is fair            │
│ ┌──────────────────────────┐ │
│ │ 🔒 Nobody can see your   │ │
│ │ dice, not even us.       │ │
│ │ ▸ How: encrypted euint8… │ │
│ └──────────────────────────┘ │
│ ┌──────────────────────────┐ │
│ │ 🎲 The roll can't be     │ │
│ │ rigged.  ▸ How           │ │
│ └──────────────────────────┘ │
│  … 3 more cards …            │
│  Check it yourself           │
│  Bluff ↗  Cashier ↗  Chips ↗ │
│  ▔▔ board peeks in below ▔▔  │
└──────────────────────────────┘
```

## 6-2: landing page and metadata

- **`Hero`:**
  - the name, the tagline, and the **tumbling die** (`TumblingDie`, still under reduced motion);
  - **one way in:** a large raised button to `/play`, which sends people who aren't signed in to sign-in first. Proposed label: **"Sit down and play"**, matching the sign-in page, since "Play now" is gone from the lobby;
  - **three tilting cards** (`RaisedCard`): **Roll in secret**, **Bid boldly**, **Call the bluff**, each with one line and a small die picture;
  - the quiet links **How to play** and **Why it's fair**;
  - the **street backdrop**, so the page matches the rest of the game.
- **Metadata:**
  - each public page gets its own title and description;
  - `app/opengraph-image.tsx` makes a 1200 × 630 share image with `next/og` (already part of Next): the name, the tagline and the four seat colours;
  - the sitemap lists `/`, `/how-to-play` and `/fairness`;
  - game pages keep `robots: noindex`.
- **Tests:** the hero's button goes to `/play`; the cards and links render; the sitemap lists the three public pages; the share image route answers with a PNG in the smoke test.

## 6-3: watching

- **Finding games in progress:** `useGamesInPlay` reads `GameStarted` events from the last ~20 minutes, which covers the 15-minute game clock, using the same log search as the round history. It then reads each table and keeps those that are public and still playing or revealing. It refreshes every 10 s.
- **Lobby:** a quiet **"Watch a game"** button beside Open tables, with a count. It opens a dialog of game cards (players' faces and names, round, dice left, Computer badges) with a **Watch** button on each. An empty state says "No games being played right now".
- **The table page:** a signed-in player who isn't seated, at a table that is playing, revealing or finished, gets the **watching view** instead of the visitor view:
  - the board with every seat at its side and **every cup closed**;
  - the current bid, whose turn it is, dice counts and the round history;
  - reveals as everyone sees them, and the result at the end;
  - a banner, "You are watching this game", and a **Back to the lobby** button;
  - no bid controls, no own dice and no tips.
- **Watchers never send keeper moves.** The keeper is off for watchers, as the ADR requires, and a test checks it.
- **Private tables:** never listed. Opening one by link shows the watching view only once the game has started, and never shows hidden values. The contract doesn't allow that in any case.
- **Tests:**
  - games in progress: started, finished, private and other tables are filtered correctly;
  - the lobby dialog: the list, empty, loading and error states;
  - the watching view: no dice, no controls, no keeper, the banner;
  - a reveal is shown to a watcher;
  - the route stays protected.

```
 Lobby                           Watching (/table/12)
┌───────────────────────┐       ┌───────────────────────────┐
│ [Quick play][Play the │       │ You are watching this game │
│              computer]│       │       (Ada) 3 dice ▢▢▢     │
│ [Create] [Open 2]     │       │   ┌───────────────┐        │
│ [Watch a game  1]     │       │   │ bid 3 × ⚄     │        │
│  How to play · Fair?  │       │   └───────────────┘        │
└───────────────────────┘       │   (Baba Dice) Computer ▢▢  │
                                 │  [ Back to the lobby ]     │
                                 └───────────────────────────┘
```

## Wording (draft, in each feature's `copy.ts`)

- `watchGame: "Watch a game"`, `watch: "Watch"`, `watching: "You are watching this game"`, `noGamesInPlay: "No games being played right now"`, `gamesInPlayProblem: "We could not load the games being played."`
- `howToPlay: "How to play"`, `whyFair: "Why it's fair"`, `sitDown: "Sit down and play"`
- Fairness headings as in 6-1. The detail lines may use FHE terms; everything else stays plain.

## Removed

- The bare `Hero` text layout is replaced; its test is updated, not kept alongside.
- Nothing else is superseded. The visitor view stays for waiting tables.

## Order and timing

6-1, then 6-2, then 6-3, each merged before the next starts. Aim: all three before PR 9 and PR 7, leaving time for the video by 2026-12-14.
