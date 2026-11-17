import type { FoundGame } from "./game-log";

export interface GameLogMemory {
  searchedTo: bigint;
  joins: FoundGame[];
  lefts: FoundGame[];
}

function keyFor(account: string): string {
  return `bluff:games:${account.toLowerCase()}`;
}

function isDigits(value: unknown): value is string {
  return typeof value === "string" && /^\d+$/.test(value);
}

function gamesFrom(value: unknown): FoundGame[] | null {
  if (!Array.isArray(value)) return null;
  const games: FoundGame[] = [];
  for (const item of value) {
    if (!Array.isArray(item) || !isDigits(item[0]) || !isDigits(item[1])) return null;
    games.push({ id: BigInt(item[0]), block: BigInt(item[1]) });
  }
  return games;
}

export function rememberedGames(account: string): GameLogMemory | null {
  try {
    const saved: unknown = JSON.parse(window.localStorage.getItem(keyFor(account)) ?? "null");
    if (typeof saved !== "object" || saved === null) return null;
    const { searchedTo, joins, lefts } = saved as Record<string, unknown>;
    const joined = gamesFrom(joins);
    const left = gamesFrom(lefts);
    if (!isDigits(searchedTo) || joined === null || left === null) return null;
    return { searchedTo: BigInt(searchedTo), joins: joined, lefts: left };
  } catch (error) {
    console.warn("Saved games could not be read, so they'll be found again.", error);
    return null;
  }
}

function plain(games: readonly FoundGame[]): string[][] {
  return games.map((game) => [game.id.toString(), game.block.toString()]);
}

export function rememberGames(account: string, memory: GameLogMemory) {
  try {
    window.localStorage.setItem(
      keyFor(account),
      JSON.stringify({
        searchedTo: memory.searchedTo.toString(),
        joins: plain(memory.joins),
        lefts: plain(memory.lefts),
      })
    );
  } catch (error) {
    console.warn("Your games could not be saved for next time.", error);
  }
}
