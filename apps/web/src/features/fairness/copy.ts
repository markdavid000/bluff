export const fairnessCopy = {
  title: "Why Bluff is fair",
  intro:
    "Bluff keeps every die secret until a bluff is called, using Zama's fully homomorphic encryption (FHE) on Ethereum's Sepolia test network. Here is how, and how to check it yourself.",
  how: "How it works",
  points: [
    {
      icon: "lock",
      title: "Nobody can see your dice, not even us.",
      detail:
        "Each die is an encrypted euint8, rolled inside the Bluff contract with FHE.randEuint16() and turned into a face. The contract gives access to exactly two parties: itself (FHE.allowThis) and the player who rolled it (FHE.allow). Whoever deployed the contracts has no access, and confidentiality.test.ts proves it against the owner, other players and outsiders.",
    },
    {
      icon: "target",
      title: "Nobody chooses the dice.",
      detail:
        "The randomness comes from Zama's FHEVM inside the transaction that starts the round, and it is encrypted from the moment it exists. No server, player or owner picks it or reads it.",
    },
    {
      icon: "zoom",
      title: "A called bluff shows every die, with proof.",
      detail:
        "Calling a bluff marks every die in play as publicly decryptable (FHE.makePubliclyDecryptable). Anyone can then ask Zama's decryption network for the values, but settleReveal only accepts them with the network's signed proof (FHE.checkSignatures). Dice that were never rolled can't be passed off as the result.",
    },
    {
      icon: "rocket",
      title: "The computer plays by the same rules.",
      detail:
        "The computer is an ordinary player with its own wallet. It decrypts only its own dice, through the same Zama relayer every player uses. When it was tested asking for another player's die, the relayer refused.",
    },
    {
      icon: "money-bag",
      title: "Your chips stay private too.",
      detail:
        "Chips are a confidential token. Balances, buy-ins and payouts are encrypted euint64 values: only you can read your balance, the cashier contract reads only what it needs to pay out, and the pot is readable by the cashier contract alone.",
    },
  ],
  checkTitle: "Check it yourself",
  check:
    "Every contract is verified on Etherscan, so its source is public, and so are the tests that prove the points above.",
  contracts: {
    bluff: "Bluff, the game",
    cashier: "BluffCashier, the buy-ins and payouts",
    invites: "BluffInvites, private table links",
    faucet: "ChipFaucet, practice chips and profiles",
  },
  confidentialityTests: "The confidentiality tests",
  sourceCode: "The source code",
  opensInNewTab: "(opens in a new tab)",
  howToPlay: "How to play",
  play: "Sit down and play",
} as const;
