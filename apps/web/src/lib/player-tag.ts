export function tagOf(address: string): string {
  return `#${address.slice(-4).toUpperCase()}`;
}

export function plainName(nickname: string | null | undefined, fallback: string): string {
  return nickname?.trim() ? nickname.trim() : fallback;
}

export function displayName(
  nickname: string | null | undefined,
  address: string,
  fallback: string
): string {
  return `${plainName(nickname, fallback)} ${tagOf(address)}`;
}
