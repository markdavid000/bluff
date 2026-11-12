# The web app, explained simply

- **Technical version:** [ADR-2026-11-11-web-app.md](ADR-2026-11-11-web-app.md)

## What is being decided

The game itself is finished and running on the practice network. Now we build the website people actually play on. Most of how it behaves was already agreed: how sign-in works, how messages appear, how a game flows. This decision covers the remaining pieces.

## The decisions, one by one

**Our own line to the network.** Today we use a free public connection that everyone shares. In testing, it sometimes answered with slightly old information, like a scoreboard that's a few seconds behind. We'll get Bluff its own connection, with a backup that takes over automatically if the first one has trouble. The app also always remembers the newest moment it has seen, and never shows anything older. So the screen never jumps back to a turn that already happened.

**Keeping a table moving without anyone pressing buttons.** Some steps belong to nobody: revealing the dice after a call, checking everyone paid, removing a player who stopped playing. Every player's app is ready to do these. To stop all of them doing it at once, they take turns: one player's app goes first, and the others only step in a few seconds later if it still hasn't happened. A game keeps going as long as anyone at the table has it open.

**Names you can tell apart.** Every player has a nickname, plus a short tag, like "Brave Otter #4E31". Two players can both pick "Brave Otter", and the tag tells them apart. When you first arrive, a nickname is suggested for you. Press **Suggest another** for a new one, or type your own.

**Making waits feel like part of the game.** A move takes about 5 to 15 seconds to settle. Rather than a spinner, you see your move straight away, your dice rolling while they're revealed to you, and the dice turning face up when someone calls a bluff. If something takes unusually long, the app says the network is busy.

**Practice chips, as the game really works.** You can claim 100 free chips once a day. The how-to-play page will be corrected to match.

**Winning and cashing out.** When you win a game with chips at stake, the pot goes straight into your chip balance. There's nothing to press. **Cash out** turns your chips back into the practice dollars they were made from, which then show in any wallet. Here they're practice money; on the real network the same button would pay out real dollars. Your chip count is private, but practice dollars are public. Once you cash out, the chips card shows your practice dollars and links to a public page listing every cash out. If a cash out is interrupted halfway, the app offers to finish it, and pressing **Try again** never takes your chips twice.

**Only your wallet ever signs.** If you sign in with Google or email, the app uses the wallet it made for you, even if another wallet such as MetaMask is installed in your browser. You never see a wallet pop-up. If you sign in with your own wallet, it asks you once to sign a free permission to see your chips, and switches to the game's network if needed.

**Building before the website host comes back.** Our hosting account is paused until late November. Until then, every piece is tested on our own machines, and it goes online the moment hosting returns.

## What it costs

- One new free account with a network provider, set up by the project owner.
- A handful of well-known building blocks, each added only when it's first used.
- A design sample for the owner to approve, then seven separate pieces of work, each one usable on its own, so progress shows week by week.

## How we'll know it works

Each piece is played for real, signed in with Google and with a personal wallet. Before submission, we'll time full games with 2, 3 and 4 players, aiming for 8 to 12 minutes. We'll also check that tables kept moving with no wasted steps.
