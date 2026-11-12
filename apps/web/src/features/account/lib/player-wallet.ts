const inProgress = new Map<string, Promise<string>>();

export function makeWalletOnce(
  playerId: string,
  create: () => Promise<{ address: string }>
): Promise<string> {
  const existing = inProgress.get(playerId);
  if (existing) return existing;
  const made = create().then(
    (wallet) => wallet.address,
    (error: unknown) => {
      inProgress.delete(playerId);
      throw error;
    }
  );
  inProgress.set(playerId, made);
  return made;
}
