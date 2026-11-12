const MIN_LENGTH = 3;
const MAX_LENGTH = 20;
const ALLOWED = /^[A-Za-z0-9 _-]+$/;

export function isValidNickname(nickname: string): boolean {
  if (nickname.length < MIN_LENGTH || nickname.length > MAX_LENGTH) return false;
  if (!ALLOWED.test(nickname)) return false;
  if (nickname.startsWith(" ") || nickname.endsWith(" ")) return false;
  return !nickname.includes("  ");
}

const ADJECTIVES = [
  "Brave",
  "Swift",
  "Clever",
  "Bold",
  "Calm",
  "Quiet",
  "Lucky",
  "Sharp",
  "Proud",
  "Wise",
  "Steady",
  "Sly",
  "Gentle",
  "Fierce",
  "Merry",
  "Noble",
  "Quick",
  "Royal",
  "Sunny",
  "Wild",
  "Bright",
  "Cool",
  "Daring",
  "Eager",
  "Fair",
  "Golden",
  "Happy",
  "Jolly",
  "Keen",
  "Lively",
  "Mighty",
  "Nimble",
  "Patient",
  "Ready",
  "Smart",
  "Strong",
  "True",
  "Warm",
  "Witty",
  "Zesty",
] as const;

const ANIMALS = [
  "Lion",
  "Gazelle",
  "Leopard",
  "Elephant",
  "Giraffe",
  "Zebra",
  "Cheetah",
  "Hippo",
  "Rhino",
  "Buffalo",
  "Antelope",
  "Eagle",
  "Falcon",
  "Hornbill",
  "Pelican",
  "Heron",
  "Crane",
  "Parrot",
  "Weaver",
  "Kingfisher",
  "Tortoise",
  "Crocodile",
  "Python",
  "Chameleon",
  "Gecko",
  "Hare",
  "Meerkat",
  "Mongoose",
  "Hyena",
  "Jackal",
  "Baboon",
  "Gorilla",
  "Chimp",
  "Monkey",
  "Otter",
  "Porcupine",
  "Warthog",
  "Kudu",
  "Impala",
  "Oryx",
] as const;

export function suggestNickname(random: () => number = Math.random, avoid?: string): string {
  for (;;) {
    const adjective = ADJECTIVES[Math.floor(random() * ADJECTIVES.length)];
    const animal = ANIMALS[Math.floor(random() * ANIMALS.length)];
    const name = `${adjective} ${animal}`;
    if (name !== avoid && isValidNickname(name)) return name;
  }
}
