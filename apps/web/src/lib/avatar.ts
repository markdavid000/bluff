export const PRESET_AVATARS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12] as const;

export type PresetAvatar = (typeof PRESET_AVATARS)[number];

export function isPresetAvatar(value: number): value is PresetAvatar {
  return Number.isInteger(value) && value >= 1 && value <= PRESET_AVATARS.length;
}

export function defaultAvatarFor(address: string): PresetAvatar {
  const digits = address.toLowerCase().replace(/^0x/, "");
  let total = 0;
  for (const digit of digits) total = (total * 31 + parseInt(digit, 16)) % 1_000_003;
  return ((total % PRESET_AVATARS.length) + 1) as PresetAvatar;
}

export function avatarSource(preset: number, address: string): string {
  const shown = isPresetAvatar(preset) ? preset : defaultAvatarFor(address);
  return `/avatars/${shown}.svg`;
}
