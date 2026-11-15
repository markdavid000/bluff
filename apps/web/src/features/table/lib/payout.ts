export function potOf(buyIn: bigint, seats: number): bigint {
  return buyIn * BigInt(seats);
}

export function shareOf(pot: bigint, winners: readonly string[], me: string): bigint | null {
  const index = winners.findIndex((winner) => winner.toLowerCase() === me.toLowerCase());
  if (index === -1) return null;
  const count = BigInt(winners.length);
  const share = pot / count;
  return index === 0 ? share + (pot % count) : share;
}
