import { type Address, type Hex, isHex } from "viem";

const BYTES32_LENGTH = 66;

function keyFor(account: Address): string {
  return `bluff:cash-outs:${account.toLowerCase()}`;
}

function isRequestId(value: unknown): value is Hex {
  return typeof value === "string" && isHex(value) && value.length === BYTES32_LENGTH;
}

export function rememberedCashOuts(account: Address): Hex[] {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(keyFor(account)) ?? "[]");
    return Array.isArray(saved) ? saved.filter(isRequestId) : [];
  } catch (error) {
    console.warn("Saved cash outs could not be read.", error);
    return [];
  }
}

function save(account: Address, ids: Hex[]) {
  try {
    if (ids.length === 0) window.localStorage.removeItem(keyFor(account));
    else window.localStorage.setItem(keyFor(account), JSON.stringify(ids));
  } catch (error) {
    console.warn("A cash out could not be saved for later.", error);
  }
}

export function rememberCashOut(account: Address, id: Hex) {
  const ids = rememberedCashOuts(account);
  if (!ids.includes(id)) save(account, [...ids, id]);
}

export function forgetCashOut(account: Address, id: Hex) {
  save(
    account,
    rememberedCashOuts(account).filter((saved) => saved !== id)
  );
}
