export const landingCopy = {
  tagline: "Roll in secret. Bid boldly. Call out the liars.",
  explainer:
    "Everyone rolls dice that only they can see. Guess what is on the table, or call a bluff. Play friends, anyone online, or the computer.",
  play: "Sit down and play",
  movesLabel: "How a turn goes",
  moves: [
    {
      title: "Roll in secret",
      body: "Your dice are hidden under your cup. Only you can see them.",
    },
    {
      title: "Bid boldly",
      body: "Say how many dice on the table show a number. Each bid goes higher.",
    },
    { title: "Call the bluff", body: "Think they are lying? Call it, and every cup lifts." },
  ],
  demoLabel:
    "A round being played: three players bid on fives, you call the bluff, the dice show only three fives counting ones, so Femi loses a die.",
  demoNames: { top: "Ada", left: "Kola", right: "Femi", bottom: "You" },
  demoBid: (quantity: number) => `${quantity} × five`,
  demoCall: "Bluff!",
  demoResult: "There were 3. Femi loses a die.",
  bidExample: "Three fives",
  bidQuantity: "3 ×",
  fair: "Nobody, not even us, can see your dice until a bluff is called.",
} as const;
