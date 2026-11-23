export const rulesCopy = {
  title: "How to play",
  intro: "Bluff is a dice game of nerve for 2 to 4 players. A game takes about 10 minutes.",
  ideaTitle: "The idea",
  idea: "Everyone rolls dice that only they can see. Players take turns guessing how many dice on the whole table show a certain number, and each guess must be bigger than the last. If you think someone is lying, call their bluff. Lose a guess, lose a die. The last player with dice wins.",
  startTitle: "Getting started",
  start: [
    "Sign in with Google, your email or your own wallet.",
    "The first time, you get a nickname (change it if you like) and 100 practice chips. They are not real money.",
    "Press Quick play to be seated at a table straight away, Play the computer to start a game against the computer at once, or Create a table and share the link with friends.",
  ],
  moreChips: "Need more chips? You can get 100 more once a day.",
  diceTitle: "Your dice",
  dicePerPlayer: (players: number, dice: number) => `${players} players: ${dice} dice each`,
  diceHidden:
    "Your dice are hidden from everyone else. Nobody, not even us, can see them until someone calls a bluff.",
  wildTitle: "Ones are wild",
  wild: "A one counts as whatever number is being guessed.",
  wildExample: "Guessing 4s? Three of these dice count.",
  turnTitle: "Your turn",
  turnTime: "You have 60 seconds. Do one of two things:",
  raise: "Raise. Guess something bigger than the last guess:",
  raiseWays: [
    'more dice of any number ("four 3s" after "three 5s"), or',
    'the same number of dice with a higher number ("three 6s" after "three 5s").',
  ],
  raiseFaces: "You guess numbers 2 to 6. Ones are wild, so you never guess them directly.",
  atLeast:
    'A guess means "at least". "Two 4s" means there are at least two dice showing 4 across everyone\'s dice, ones included. If there are three or five, the guess is still true. It\'s only a bluff when there are fewer than guessed.',
  atLeastExample:
    'For example: you have two 4s and your opponent has one. They guess "two 4s". There are three 4s on the table, which is at least two, so the guess is true. If you call bluff, you lose a die. "Four 4s" would have been a bluff.',
  call: "Call bluff. If you think the last guess is wrong, call it. The first player of a round has to guess; there is nothing to call yet.",
  calledTitle: "When a bluff is called",
  called:
    "Everyone's dice are shown. Count the dice showing the guessed number, plus all the ones.",
  calledOutcomes: [
    "There are at least as many as guessed: the guess was true, so the player who called loses a die.",
    "There are fewer: the guess was a bluff, so the player who made it loses a die.",
  ],
  nextRound: "The player who lost a die starts the next round, and everyone gets fresh dice.",
  winTitle: "Winning",
  win: [
    "Lose all your dice and you are out. The last player with dice wins every chip on the table.",
    "Every game has a 15-minute clock. When it runs out, the round being played is the last one, and the player with the most dice wins. If players are tied, they share the chips.",
  ],
  leaveTitle: "Time and leaving",
  leave: [
    "Run out of time on your turn: you lose a die. Miss two turns in one game and you are out.",
    "Leave a table before the game starts: you get your chips back.",
    "Leave during a game: you are out, and your chips stay on the table for the winner.",
    "Lose your connection: come back before your time runs out and carry on where you left off.",
  ],
  fairTitle: "Is it fair?",
  fair: [
    "Nobody chooses the dice. They are rolled by the game itself, and not even its makers can choose or predict them.",
    "Nobody can peek. Only you can see your dice until a bluff is called.",
    "Everyone sees the proof. When the dice are shown, they come with proof that they are the dice that were rolled.",
  ],
  whyFair: "Why it's fair",
  play: "Sit down and play",
  dice: (count: number) => `${count} dice`,
} as const;
