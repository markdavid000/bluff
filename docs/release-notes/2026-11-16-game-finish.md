---
date: 2026-11-16
branch: feat/game-finish
base: dev
scenario-impact: needs_automation
---

# Play again, see the rounds so far, and learn as you go

When a game ends, everyone can go again with one press: whoever presses **Play again** first gets a new table with the same seats and chips, and the others are offered a seat at it. On a laptop, a panel beside the board lists this round's bids and how each earlier round ended. New players get three short tips in their first turns.

## Changes

- **Play again** on the results card sets up a new table with the last game's seats, buy-in and privacy, after the usual chip check.
- The results card checks every 6 seconds, for up to 10 minutes, whether another player from the game now hosts a matching table, and offers **Join Ada's new table** or **Pay 10 chips and join Ada**. For a private table, it says to ask the host for the link.
- **Rounds so far** panel under the round badge on screens 1024 pixels wide and up, floating over the board's margin so the board stays centred. The round badge, bid badge and panel sit 2rem further left on wide screens, and the clock and Leave button stay put. A tilted wooden card with the patterned band, the newest bid highlighted and popping in: this round's bids in order, and one line per finished round (bid held, bluff caught, or ran out of time). It is read from the chain, so it survives a reload, and the bid on the table shows even before the history has caught up. Phones don't show it or read it.
- **First-game tips:** "Ones count as every face", that a bid means at least that many, how to raise, and when to call a bluff, one per turn in that order, each shown once and remembered in the browser. On a tip turn the safe or risky advice stays quiet.
- **Bluff calls are named:** while the dice are revealed, the player who was called sees "Maki called your bluff! Revealing the dice…", the caller sees "You called Ada's bluff…", and everyone else sees "Maki called Ada's bluff…", instead of only "Revealing dice…".
- **The bid controls wait for your throw:** Raise and Call bluff stay hidden while your cup is still shaking, from the first frame of each round, and appear once your dice are thrown. If your dice can't be read, they still appear so you can play.
- **Things ease in and out:** anything that appears or goes away on a condition now fades and rises in over a third of a second, and fades out faster, instead of snapping. This covers the bid controls, the game clock, the rounds panel, the turn line, the "Your turn!" tag, last-bid chips, the current bid, the results card's messages and buttons, the waiting room's seats, line and buttons, the chips panel and lobby notes, and the swaps between the waiting room, the game and the results. Things that were already meant to pop keep their pop on the way in. With reduced motion, it's a short plain fade. A shared `Appear` component does it, and content on its way out can't be pressed.
- **Shorter names:** players are named by their nickname alone everywhere except your own profile button in the header, which keeps its `#7BAC` tag. A player without a nickname shows as "Player".
- **"At least" made clear:** the reveal card now says why, for example "The bid said at least 2, and there were 3. That's enough." or "The bid said at least 4, but there were only 3." `docs/how-to-play.md` explains that a guess means "at least", with a worked example.
- Saved settings gain a `seenTips` list.
- `usePrefersDark` now sits on a general `useMediaQuery` hook, which the history panel also uses.

## Removed

- Nothing. These add to the 5A game screen.

## Verification

- New Vitest tests: the new-table offer rule (12 cases), `usePlayAgain`, the results card buttons, building the round history and merging the table's bid, `useRoundHistory`, the history panel's ready, empty, loading and failed states, laptop-only display, the first-game tips, the coach pausing, and saved tips. `pnpm preflight` passes: 802 web tests, the build and the smoke test.
- Live on Sepolia, signed in with Google in two browsers (Favour and Maki):
  - A free game: the history filled in for both players and came back after a reload mid-game. All three tips appeared in order across turns, **Got it** closed them, and the safe or risky tip came back once all three were seen.
  - Favour left, and both results cards showed **Play again**. Maki played again, and Favour's card offered **Join Maki #7BAC's new table** after 20 to 30 seconds (the time the chain takes to show a new table). Favour joined it.
  - A 10-chip game: Maki won 20 chips and played again, paying 10. Favour was offered **Pay 10 chips and join Maki #7BAC**, joined and paid, then left and was refunded.
  - A private game joined through the invite link: Maki played again, the new table was private, and Favour's card said "Maki #7BAC started a new private table. Ask Maki #7BAC for the link." with no join button.
  - The new layout, the bid controls waiting (Raise appeared 11.5 seconds after the game screen, once the dice were thrown), and the call notice on both sides: "Maki #7BAC called your bluff! Revealing the dice…" and "You called Favour #0811's bluff. Revealing the dice…".
- Not checked live: the three- and four-player wording ("Maki called Ada's bluff"), which is unit tested, and an own-wallet (MetaMask) player, which is still the next live test on the agenda.
