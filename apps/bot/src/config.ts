import { createHash } from "node:crypto";
import { english } from "viem/accounts";
import { MOST_PLAYERS } from "./player-pool";

export interface BotConfig {
  mnemonic: string;
  rpcUrl: string;
  allowedOrigins: string[];
  maxPlayers: number;
  port: number;
}

type Env = Record<string, string | undefined>;

const PHRASE_LENGTHS = new Set([12, 15, 18, 21, 24]);
const BITS_PER_WORD = 11;
const DEFAULT_MAX_PLAYERS = 20;
const DEFAULT_PORT = 8080;
const WORDS = english;

function hasValidChecksum(words: readonly string[]): boolean {
  const indexes = words.map((word) => WORDS.indexOf(word));
  if (indexes.some((index) => index < 0)) return false;
  const bits = indexes.map((index) => index.toString(2).padStart(BITS_PER_WORD, "0")).join("");
  const checksumBits = bits.length / 33;
  const entropyBits = bits.slice(0, bits.length - checksumBits);
  const entropy = Buffer.from(entropyBits.match(/.{8}/g)?.map((byte) => parseInt(byte, 2)) ?? []);
  const hash = createHash("sha256").update(entropy).digest();
  const expected = [...hash]
    .map((byte) => byte.toString(2).padStart(8, "0"))
    .join("")
    .slice(0, checksumBits);
  return expected === bits.slice(bits.length - checksumBits);
}

function isSecretPhrase(value: string): boolean {
  const words = value.trim().split(/\s+/);
  return PHRASE_LENGTHS.has(words.length) && hasValidChecksum(words);
}

function isHttpsUrl(value: string): boolean {
  return URL.canParse(value) && new URL(value).protocol === "https:";
}

function asOrigin(value: string): string | null {
  if (!URL.canParse(value)) return null;
  const url = new URL(value);
  return url.protocol === "http:" || url.protocol === "https:" ? url.origin : null;
}

function wholeNumber(value: string | undefined, fallback: number): number | null {
  if (value === undefined || value === "") return fallback;
  return /^\d+$/.test(value) ? Number(value) : null;
}

export function readConfig(env: Env): BotConfig {
  const problems: string[] = [];
  const mnemonic = env.BOT_MNEMONIC?.trim() ?? "";
  if (!isSecretPhrase(mnemonic)) problems.push("BOT_MNEMONIC must be a valid BIP-39 secret phrase");
  const rpcUrl = env.SEPOLIA_RPC_URL ?? "";
  if (!isHttpsUrl(rpcUrl)) problems.push("SEPOLIA_RPC_URL must be an https address");
  const origins = (env.ALLOWED_ORIGINS ?? "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
  const allowedOrigins = origins.map(asOrigin);
  if (origins.length === 0 || allowedOrigins.some((origin) => origin === null)) {
    problems.push("ALLOWED_ORIGINS must list one or more sites, separated by commas");
  }
  const maxPlayers = wholeNumber(env.BOT_MAX_PLAYERS, DEFAULT_MAX_PLAYERS);
  if (maxPlayers === null || maxPlayers < 1 || maxPlayers > MOST_PLAYERS) {
    problems.push(`BOT_MAX_PLAYERS must be a whole number from 1 to ${MOST_PLAYERS}`);
  }
  const port = wholeNumber(env.PORT, DEFAULT_PORT);
  if (port === null || port < 1 || port > 65_535) problems.push("PORT must be a port number");
  if (problems.length > 0 || maxPlayers === null || port === null) {
    throw new Error(`The computer player can't start: ${problems.join("; ")}`);
  }
  return {
    mnemonic,
    rpcUrl,
    allowedOrigins: allowedOrigins.filter((origin): origin is string => origin !== null),
    maxPlayers,
    port,
  };
}
