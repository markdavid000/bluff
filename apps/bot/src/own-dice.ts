import type { Face } from "@bluff/game";

const FACE_OF_STORED: readonly Face[] = [1, 2, 3, 4, 5, 6];

function storedValue(value: unknown): number | null {
  const number = typeof value === "bigint" ? Number(value) : value;
  return typeof number === "number" && Number.isInteger(number) ? number : null;
}

export function facesFrom(values: readonly unknown[]): Face[] {
  return values.map((value) => {
    const stored = storedValue(value);
    const face = stored === null ? undefined : FACE_OF_STORED[stored];
    if (face === undefined) throw new Error(`A decrypted value is not a die: ${String(value)}`);
    return face;
  });
}
