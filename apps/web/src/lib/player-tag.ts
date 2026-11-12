export function tagOf(address: string): string {
  return `#${address.slice(-4).toUpperCase()}`;
}

export function displayName(
  nickname: string | null | undefined,
  address: string,
  fallback: string
): string {
  const name = nickname?.trim() ? nickname.trim() : fallback;
  return `${name} ${tagOf(address)}`;
}
