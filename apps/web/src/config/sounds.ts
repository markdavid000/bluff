export const SOUNDS = {
  tap: { url: "/audio/tap.mp3", channel: "effects", volume: 0.5 },
  shake: { url: "/audio/shake.mp3", channel: "effects", volume: 0.8 },
  roll: { url: "/audio/roll.mp3", channel: "effects", volume: 0.9 },
  knock: { url: "/audio/knock.mp3", channel: "effects", volume: 0.8 },
  drum: { url: "/audio/drum.mp3", channel: "effects", volume: 0.9 },
  shekere: { url: "/audio/shekere.mp3", channel: "effects", volume: 0.7 },
  cowries: { url: "/audio/cowries.mp3", channel: "effects", volume: 0.7 },
  settle: { url: "/audio/settle.mp3", channel: "effects", volume: 0.8 },
  thud: { url: "/audio/thud.mp3", channel: "effects", volume: 0.6 },
  tick: { url: "/audio/tick.mp3", channel: "effects", volume: 0.4 },
  celebration: { url: "/audio/celebration.mp3", channel: "effects", volume: 0.5 },
  drumLoop: { url: "/audio/drum-loop.mp3", channel: "music", volume: 0.3, loop: true },
  bellLoop: { url: "/audio/bell-loop.mp3", channel: "music", volume: 0.38, loop: true },
  bothLoop: { url: "/audio/drum-and-bell-loop.mp3", channel: "music", volume: 0.3, loop: true },
} as const;

export type SoundName = keyof typeof SOUNDS;
