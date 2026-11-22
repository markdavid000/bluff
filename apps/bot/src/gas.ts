export const GAS_FLOOR = 600_000n;

export function gasLimit(estimate: bigint | undefined): bigint {
  const roomy = estimate === undefined ? 0n : (estimate * 3n) / 2n;
  return roomy > GAS_FLOOR ? roomy : GAS_FLOOR;
}
