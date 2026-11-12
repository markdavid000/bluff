# ADR-2026-11-11: Look, feel and sound

- **Status:** Approved
- **Approved by:** (MarkDavid, 11th Nov 2026; filled in by the maintainer)
- **Companion:** [ADR-2026-11-11-look-feel-and-sound-for-dummies.md](ADR-2026-11-11-look-feel-and-sound-for-dummies.md)
- **Builds on:** [The web app](ADR-2026-11-11-web-app.md)
- **Plan:** [2026-11-11-web-app-plan.md, section 7](../plans/2026-11-11-web-app-plan.md#7-look-feel-and-sound)

## Context

The owner's brief: Bluff should not look like every other web3 app. It should feel local and familiar to anyone in Nigeria who grew up on Ludo, Ayo and Whot. That means a real board with a player on each side and their pieces in front of them, buttons and cards with depth, dice that really tumble and roll fast, its own icons, African music and sound effects that can be switched off, and toasts that match. It should be easy to play, with no complicated words.

The constraints are just as real:

- **Phones and data.** Most players will be on mid-range Android phones, often on mobile data that costs money. The standards say the page must feel instant on a mid-range phone, and the landing page must not pay for game code.
- **Hidden dice.** A player's dice are revealed to them by the Zama SDK, which takes 4 to 6 seconds (Sepolia run). The animation can't pick the faces; it has to land on the faces the SDK returns.
- **Accessibility.** Keyboard play, text alternatives for dice, contrast on patterned backgrounds, reduced motion, and sound that never carries information on its own.
- **Originality.** Every pattern, icon, texture and sound is properly licensed (see "Sourced, not hand-made"). Nothing is copied from an existing game's art or audio. Ludo's board layout is a traditional design anyone may use; its commercial apps' artwork is not.
- **Time.** Four and a half weeks to the deadline, for the app and the look together.

## Options considered

### How 3D is drawn

- **CSS 3D only** (`perspective`, `preserve-3d`, layered shadows). Cheap, crisp and accessible. Fine for buttons, cards and toasts. A board and tumbling dice in CSS look stiff, and real tumbling is not practical.
- **WebGL for everything** (three.js). The whole app as one 3D scene. Heavy on phones and hard to make accessible; text and forms in WebGL are a poor fit.
- **Hybrid.** One WebGL scene for the board and dice on the table screen, loaded only there. Everything else (landing cards, buttons, panels, toasts, icons) is CSS 3D and SVG, as real HTML with the accessibility that brings.

### How dice roll

- **A canned animation per face.** Light; every roll looks the same.
- **A physics engine in the browser** (`cannon-es`, about 40 KB gzipped). Dice are thrown, bounce off the board edges and settle naturally, with a different roll every time. Once a die settles, the app turns the die model, not the physics, so the settled top face shows the value the SDK returned. The throw looks free and the result is exact.
- **Rapier** (WASM physics). More accurate; over 1 MB to download, too much for this.

### Sound

- **An audio library** (Howler). A familiar API; one more dependency.
- **The Web Audio API**, which every target browser has. A small sound module in `lib/` covers decode-once, play, volume and mute. No dependency.

### Where the sounds and music come from

- **Royalty-free libraries** with a licence that allows this use, credited in the app.
- **Generated originals**, through an audio generation tool, with the owner choosing the takes.
- **Recorded originals**, from local instruments.

## Decision

### The look

- **A Bluff table, Nigerian at heart.** A dark mahogany board seen from a low angle, four coloured home corners (red, green, yellow, blue, the colours every Ludo player knows), and a raised centre where the dice land. Each player sits on their own side, with their avatar, name and tag, and a carved calabash holding their dice. When a player loses a die, it leaves their cup on the board. Three players take three sides, two players sit facing each other.
- **Patterns.** Original SVG motifs in the adire style (see "Sourced, not hand-made"), used as frames and edges, never as backgrounds behind text.
- **Chips and cowries.** The pot sits in the centre of the board as one stack of chips per player, in their seat colour, all the same height because everyone pays the same buy-in, each topped with a cowrie shell, the old West African money.
- **Type.** Irish Grover for headings, buttons and game labels and Nunito for body text, through `next/font` with `display: "swap"`, chosen in the design pass for how easily they read on a phone.
- **Depth everywhere.** Buttons are raised tiles with a solid underside that press down 3 to 4 px when tapped. Cards tilt slightly toward the pointer on desktop and lift on tap on phones. Toasts arrive as small wooden or patterned tiles that drop and settle, following the existing toast timing rules unchanged.
- **Icons.** Sourced, not drawn: Kenney's CC0 board-game icons for dice, players, timers and actions, and 3dicons' CC0 3D icons for profile, settings, sound, leave, invite and watch, recoloured to Bluff's tokens. The cowrie and talking-drum icons come from the same packs if they have them, otherwise they're drawn in the same style as the adire motifs. Small utility icons inside forms may stay as Lucide, recoloured to match.
- **Light and dark.** Day is warm sand and wood; night is deep indigo with lantern light on the board. Both meet WCAG AA contrast.
- **Landing page.** A hero with one die tumbling in CSS 3D (no WebGL on the landing page), the board peeking at the bottom, and three tilting cards: roll in secret, bid boldly, call the bluff. **Play now** is the biggest raised button on the page.

### The dice

- The table screen has one `@react-three/fiber` canvas holding the board, the cups and the dice. It's loaded with `next/dynamic` once the player lands on `/table/[id]`, and preloaded from the lobby when they press a table.
- Dice are thrown by `cannon-es` with a random push and spin, bounce off the board edges, and settle in about 1.2 seconds. While the player's own dice are being revealed, the cup shakes in place, so the roll itself never waits on the network. As soon as the faces arrive, the dice are thrown and land on them.
- At a call, every cup lifts and every die rolls across to its owner's side. The faces turn up in seat order, and the matching dice glow.
- Low-power fallback: if WebGL is missing, the frame rate drops below 30 for two seconds, or the player turns on reduced motion, the board switches to a CSS 2.5D version with the same layout. Dice then appear with a short flip and no throw.

### Sound

- Two switches in settings, **Music** and **Sounds**, saved in the browser. Sounds are on by default; music starts on the player's first tap (browsers block sound before that) and can be turned off at any time.
- **Music.** A calm loop in the lobby and a livelier loop at the table, built on talking drum, shekere, udu and kalimba, at a low volume under the effects.
- **Effects.** Shaking the cup, dice rolling and settling on wood, a tap for buttons, a wooden knock for a bid, a talking-drum hit for "Call bluff", a cowrie rattle for chips arriving, a soft thud for losing a die, a short celebration for a win, and a tick for the last ten seconds of a turn.
- **Format and size.** Effects are short Opus files (AAC for Safari) under 30 KB each, loaded after the first tap. Music loops are under 400 KB each and load only once music is on.
- **Source.** Each sound comes from the sources in "Sourced, not hand-made", and the owner approves every one. Licences and credits are recorded in `apps/web/public/CREDITS.md`.
- Sound never carries meaning alone: everything a sound announces is also on screen and in the live region.

### Budgets

| Route                  | Budget (gzipped, first load)                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------------------- |
| `/` and `/how-to-play` | no WebGL, no game providers; CSS 3D and SVG only                                                        |
| `/play`                | game providers and the Zama SDK warm-up; no WebGL                                                       |
| `/table/[id]`          | adds the 3D chunk: three.js, fiber and cannon-es, about 250 KB, plus board and dice assets under 600 KB |

Textures are WebP or KTX2, the board model is under 200 KB, and everything 3D is cached by the browser after the first game.

### The journey

- **The board is the centre** of the screen on every device and keeps its square shape. The top bar, the players on their sides and an **action dock** under the board are arranged around it. The dock holds only what the player can do right now, within thumb reach on a phone.
- **One sentence above the dock names the next step**, and is announced: "Your turn: raise the bid or call bluff".
- **Two taps to anything that matters**, no core action behind a menu, and every wait explained.
- **The bid picker shows every legal bid at once:** a grid of quantities (1 to the dice in play) by faces (2 to 6). Bids that aren't higher are dimmed. It opens on the first legal row and offers three one-tap quick picks. The button spells out the bid, and the player's own matching count is shown beside it. At the top bid, only Call bluff is left. Legality comes from a TypeScript mirror of `BidRules.sol`, tested against the same cases.
- **Dialogs** are carved wooden panels with a pattern frame; on phones they become bottom sheets. All of them use one shared component, with focus trapped and returned.
- **A profile page** has the avatar, name, chips, cash out, a record of games played and won, and settings.
- **Avatars are stored onchain** so every player sees them. `ChipFaucet` 1.1.0 appends an avatar mapping to its namespaced storage and adds `setAvatar(uint8)` (1 to 12), `avatarOf(address)` (0 means "not chosen", and the app picks a face from the address), `AvatarSet` and `InvalidAvatar`. The same upgrade adds `setAvatarImage(string cid)` for uploaded pictures on IPFS through Pinata, stored as a content id. It's upgraded in place after `validate-layout` passes. This is the only contract change in the web app work.
- **Avatar uploads** come near the end (plan, PR 9). The browser crops and shrinks the picture; a server route holds the Pinata key and hands out one-time upload links; the player is told the picture will be public; other players can report a picture, and the owner can hide it.

### Words

Every label stays short and plain, per the plain-language rules: "Your turn", "Bid", "Call bluff", "You lose a die". A Pidgin version of the copy is a natural next step after submission. Every string already lives in `copy.ts`, so it's a translation, not a rewrite.

## Sourced, not hand-made

The look is assembled from proven libraries and licensed assets. Bluff's own design work is limited to putting them together, and to the few things no free source has: the board layout, the calabash cup, the adire-style motifs and the gele and fila pieces for the avatars. Every asset's licence is checked on its download page, and recorded in `apps/web/public/CREDITS.md` with its source link, before it's committed.

### Libraries

| Need                                                                    | Choice                                                                                                                                                                                | Licence                                       | Why this one                                                                                                                                                                                      |
| ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 3D in React                                                             | `three` 0.187 with `@react-three/fiber` 9.8 and `@react-three/drei` 10.7                                                                                                              | MIT                                           | The standard for 3D in React; fiber 9 supports our React 19.3. Drei supplies the camera rig, environment lighting, glTF loading, `ContactShadows` and `Html` overlays                             |
| Dice physics                                                            | `cannon-es` 0.20                                                                                                                                                                      | MIT                                           | Small, and the engine used by the proven web dice rollers: the Codrops "Crafting a Dice Roller with Three.js and Cannon-es" tutorial and `dice-box-threejs`                                       |
| Landing on a given face                                                 | the technique from `dice-box-threejs`, which descends from Teall Dice: simulate the throw, read the face that lands up, then rotate the die model so the requested face is the one up | MIT                                           | Proven in production dice rollers. The package itself isn't used: its last release was in 2022, pinned to three 0.143, and its sibling `@3d-dice/dice-box` runs on Babylon.js, a second 3D engine |
| UI motion (tiles, cards, dialogs, toasts, the bid grid, layout changes) | `motion` 14 (formerly Framer Motion)                                                                                                                                                  | MIT                                           | The default for React UI motion: springs, gestures, layout animation, `AnimatePresence` for toasts and dialogs, and built-in reduced-motion support                                               |
| Choreographed sequences (the reveal, the win)                           | Motion's sequence `animate()`; GSAP 3.15 only if Motion can't express a sequence                                                                                                      | MIT; GSAP's free "standard no charge" licence | One animation library unless a real need shows up                                                                                                                                                 |
| Celebrations (cowrie shower, win burst)                                 | `@lottiefiles/dotlottie-react` 0.22 with Lottie animations, each checked for its licence                                                                                              | MIT player; Lottie Simple License animations  | Designer-made animations, small files, played on demand                                                                                                                                           |
| Toasts                                                                  | Sonner's `toast.custom` rendering our `ToastTile`, animated by Motion                                                                                                                 | MIT                                           | Keeps the agreed toast timing rules; only the look changes                                                                                                                                        |
| Dialogs                                                                 | shadcn `Dialog` (Radix) and `Drawer` (Vaul) for phone bottom sheets                                                                                                                   | MIT                                           | Accessible focus trapping out of the box; restyled as carved panels                                                                                                                               |

Considered and set aside:

- `@react-three/rapier`: excellent, but its physics engine ships as about 1.4 MB of WASM.
- `react-spring`: it overlaps Motion, and its development is slower.

### Assets

| Need                                                                      | Source                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    | Licence                                      |
| ------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------- |
| Dice sounds (shake, roll, settle) and chip and cowrie sounds              | Kenney "Casino Audio": 12 dice, 19 chip and 23 card sounds                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | CC0                                          |
| Button taps and interface sounds                                          | Kenney "Interface Sounds" and "UI Audio"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | CC0                                          |
| Talking drum, shekere, udu and kalimba effects and loops                  | Freesound, filtered to CC0, or CC-BY with credit; Pixabay Music (Pixabay licence: commercial use, no attribution needed). Both are free                                                                                                                                                                                                                                                                                                                                                                                                                   | per file                                     |
| Wood, cloth and floor textures; lantern-light environment                 | Poly Haven                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | CC0                                          |
| Dice models                                                               | the CC0 "Polyhedral Dice" set (glTF, PBR textures), or Drei's `RoundedBox` with Kenney's dice faces                                                                                                                                                                                                                                                                                                                                                                                                                                                       | CC0                                          |
| Board-game icons (dice, cards, players, timer, actions)                   | Kenney "Board Game Icons" (250 SVG and PNG) and "Board Game Info" (280+)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  | CC0                                          |
| 3D-style interface icons (profile, settings, sound, leave, invite, watch) | **3dicons** by Vijay Verma: 1,440+ Blender-made icons in four styles, with `.blend` and glTF sources, so they can be recoloured to Bluff's tokens                                                                                                                                                                                                                                                                                                                                                                                                         | CC0                                          |
| Fonts                                                                     | **Irish Grover** for headings, buttons and game labels (chunky and playful, and readable down to small labels) and **Nunito** for body text, both on Google Fonts through `next/font`. Danfo, Tac One, Fredoka, Kranky and Freckle Face were compared in the design pass: Danfo and Kranky were too hard to read, and Freckle Face blurred at small sizes                                                                                                                                                                                                 | SIL OFL 1.1                                  |
| African patterns                                                          | No free Adire or Ankara set with clear rights exists, and museum photographs of adire cloth carry mixed rights. So the patterns are drawn as **original SVG motifs in the adire style**: the starch-resist circles, ladders, spirals and leaf shapes. A traditional style can't be owned; a specific cloth's design can, so none is copied. The V&A, Penn Museum and Pitt Rivers adire holdings serve as visual references only. Adinkra symbols (`adinkra-icons`, Apache 2.0; several CC0 on Wikimedia Commons) are Ghanaian, so they're accents at most | ours, from references                        |
| Avatars (gele, fila, cap, beads, braids)                                  | **Open Peeps** by Pablo Stanley, a hand-drawn, mix-and-match library, through DiceBear's `open-peeps` style. It's set to dark skin tones and composed into 12 faces. Gele and fila headwear are added as extra pieces in the same line style, since no free set has them. The default face for a player without a choice comes from their address through DiceBear                                                                                                                                                                                        | CC0 (Open Peeps design); MIT (DiceBear code) |
| Calabash cup and board frame                                              | built from simple geometry in three (a lathe for the calabash, a bevelled frame for the board) with Poly Haven textures, since no fitting licensed model was found                                                                                                                                                                                                                                                                                                                                                                                        | ours                                         |

### Reference

The Codrops dice tutorial is the reference implementation for the throw. Board-game interfaces in the same family (Ludo, Ayo, Whot) are references for layout and feel only. No artwork, sound or layout detail is taken from any existing app.

## Diagram

```
 /  (server)          CSS 3D die · tilting cards · raised Play now          no WebGL
   │
 /play (client)       raised tiles · cowrie balance · drum toggle           Zama warm-up
   │  press a table ─► preload the 3D chunk
   ▼
 /table/[id]
 ┌──────────────────────────── WebGL canvas (fiber) ────────────────────────────┐
 │                yellow side: player 3, cup, dice                              │
 │  green side:  ┌─────────────── mahogany board ───────────────┐  blue side:   │
 │  player 2     │ cowrie pot · dice land here · bid marker     │  player 4     │
 │               └──────────────────────────────────────────────┘               │
 │                red side: you, your cup, your dice (face up to you only)      │
 └──────────────────────────────────────────────────────────────────────────────┘
   HTML over the canvas: bid panel, Call bluff, countdown, toasts, live region
   cannon-es throws ─► settle ─► turn the model to the SDK's faces
   WebGL missing, slow, or reduced motion ─► CSS 2.5D board, same layout
```

## Consequences

- Bluff looks and sounds like nothing else in the competition, and like home to its players.
- A heavier table screen, paid only by players who sit down, and cached after the first game.
- More design work: icons, patterns, board, sounds. About a week of the schedule, which moves the build targets (plan, section 9).
- One contract upgrade: `ChipFaucet` 1.1.0 for avatars, with its tests, layout validation and a docs update.
- Packages added when first used, pinned: `three`, `@react-three/fiber`, `@react-three/drei`, `cannon-es`, `motion` and `@lottiefiles/dotlottie-react`, plus `@types/three` as a dev dependency. No audio library.
- No asset spending: every library and asset is free (CC0, MIT, OFL, or the Pixabay licence). The paid fallbacks named above are used only if the free ones fall short and the owner chooses to.
- Generated or licensed audio needs the owner's ear, and a credits file.
- The CSS fallback board must be kept in step with the 3D one; both read the same table state and layout constants.

## Verification

- A design pass before any game screen is built: a clickable prototype of the board, a die roll, buttons, a toast and the landing hero, reviewed and approved by the owner.
- The dice land on the faces they are given: a test throws 600 times with fixed seeds and asserts every settled top face.
- Fallback tests: no WebGL, low frame rate and reduced motion each switch to the CSS board.
- Sound: off switches persist; nothing plays before the first tap; every sound has an on-screen twin.
- Measured on a mid-range Android phone over a throttled connection, against the route budgets, before PR 7 merges.
