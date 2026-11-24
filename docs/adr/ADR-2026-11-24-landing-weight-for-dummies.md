# Make the front page load three times less code

- **Status:** Accepted
- **Technical version:** [ADR-2026-11-24-landing-weight.md](ADR-2026-11-24-landing-weight.md)

## What is the problem?

When someone opens Bluff's front page, their browser downloads almost 1 MB of program code, about three times more than it needs. Most of it is the sign-in and wallet machinery and the encryption library for playing a real game, none of which the front page uses. On a phone, that's a slower first impression for players and judges alike.

It happens because the moving game on the front page is borrowed from the part of the app that runs real games. The tool that packages the app can't tell which borrowed pieces are safe to leave out, so it ships them all.

## What are we doing about it?

We add one line to the app's settings, telling that tool our code doesn't do anything unexpected just by being loaded, so it's safe to leave out the parts a page doesn't use. In a test build, the front page drops from 954 KB to 323 KB, about the same as the How to play page. The sign-in page gets a little lighter too.

We also add an automatic check: if the front page ever grows past 400 KB again, the build fails, so nobody can undo the improvement by accident.

## What changes for people?

Players see the front page faster, especially on phones and slower connections. Nothing changes in how the game looks or plays. It costs one small pull request and a careful run through the whole app to make sure nothing was left out by mistake.

## What could go wrong?

If some piece of code only works because it's loaded, the tool might now leave it out and something could quietly stop working. We checked, and the only such piece is the page's styling, which we keep explicitly. To be sure, we'll run every automated test and then play through the whole app by hand (signing in, the lobby, a full game against the computer, watching, history and the public pages) before merging.
