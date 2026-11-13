const TABLE_NUMBER = /^#?(\d{1,18})$/;
const TABLE_PATH = /\/table\/(\d{1,18})(?:[/?#]|$)/;

export function tablePath(id: bigint): string {
  return `/table/${id}`;
}

export function tableLink(origin: string, id: bigint): string {
  return `${origin}${tablePath(id)}`;
}

function positive(digits: string | undefined): bigint | null {
  if (!digits) return null;
  const id = BigInt(digits);
  return id > 0n ? id : null;
}

export function parseTableLink(input: string): bigint | null {
  const text = input.trim();
  const number = TABLE_NUMBER.exec(text);
  if (number) return positive(number[1]);
  return positive(TABLE_PATH.exec(text)?.[1]);
}
