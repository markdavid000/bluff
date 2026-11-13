import { keccak256, stringToBytes } from "viem";

const TABLE_NUMBER = /^#?(\d{1,15})$/;
const TABLE_PATH = /\/table\/(\d{1,15})\/?(?:\?[^#]*)?(?:#(.*))?$/;
const CODE_LENGTH = 13;
const CHECK_LENGTH = 3;
const CODE = /^[0-9a-z]{16}$/;
const CHECKS = 36n ** BigInt(CHECK_LENGTH);
const MAX_ID = 2n ** 48n;
const MAX_CODE = 2n ** 64n;

export interface Invite {
  id: bigint;
  code: bigint | null;
}

export function tablePath(id: bigint): string {
  return `/table/${id}`;
}

export function tableLink(origin: string, id: bigint, code: bigint | null = null): string {
  const link = `${origin}${tablePath(id)}`;
  if (code === null) return link;
  const text = code.toString(36).padStart(CODE_LENGTH, "0");
  return `${link}#${text}${checkFor(text)}`;
}

function checkFor(text: string): string {
  return (BigInt(keccak256(stringToBytes(text))) % CHECKS).toString(36).padStart(CHECK_LENGTH, "0");
}

function tableId(digits: string | undefined): bigint | null {
  if (!digits) return null;
  const id = BigInt(digits);
  return id > 0n && id < MAX_ID ? id : null;
}

function inviteCode(link: string): bigint | null {
  if (!CODE.test(link)) return null;
  const text = link.slice(0, CODE_LENGTH);
  if (link.slice(CODE_LENGTH) !== checkFor(text)) return null;
  let code = 0n;
  for (const character of text) code = code * 36n + BigInt(parseInt(character, 36));
  return code < MAX_CODE ? code : null;
}

export function readInviteCode(hash: string): bigint | null {
  return inviteCode(hash.startsWith("#") ? hash.slice(1) : hash);
}

export function parseInvite(input: string): Invite | null {
  const text = input.trim();
  const number = TABLE_NUMBER.exec(text);
  if (number) {
    const id = tableId(number[1]);
    return id === null ? null : { id, code: null };
  }
  const path = TABLE_PATH.exec(text);
  const id = tableId(path?.[1]);
  if (!path || id === null) return null;
  const fragment = path[2];
  if (fragment === undefined || fragment === "") return { id, code: null };
  const code = inviteCode(fragment);
  return code === null ? null : { id, code };
}
