const CHIP_DECIMALS = 6;
export const ONE_CHIP = 10n ** BigInt(CHIP_DECIMALS);

const SHOWN_DECIMALS = 2;
const AMOUNT_PATTERN = new RegExp(`^(\\d{1,12})(?:\\.(\\d{1,${CHIP_DECIMALS}}))?$`);

export function formatChips(amount: bigint): string {
  const whole = amount / ONE_CHIP;
  const shownUnit = ONE_CHIP / 10n ** BigInt(SHOWN_DECIMALS);
  const cents = (amount % ONE_CHIP) / shownUnit;
  const wholeText = new Intl.NumberFormat("en").format(whole);
  if (cents === 0n) return wholeText;
  const centsText = cents.toString().padStart(SHOWN_DECIMALS, "0").replace(/0+$/, "");
  return `${wholeText}.${centsText}`;
}

export function parseChips(input: string): bigint | null {
  const match = AMOUNT_PATTERN.exec(input.trim());
  if (!match) return null;
  const [, whole, fraction = ""] = match;
  const amount = BigInt(whole) * ONE_CHIP + BigInt(fraction.padEnd(CHIP_DECIMALS, "0"));
  return amount > 0n ? amount : null;
}

export type KnownBalance = { status: "ready"; amount: bigint } | { status: "unknown" };

export function whyUnaffordable(
  buyIn: bigint,
  balance: KnownBalance
): "show-chips" | "too-few" | null {
  if (buyIn === 0n) return null;
  if (balance.status !== "ready") return "show-chips";
  return balance.amount >= buyIn ? null : "too-few";
}
