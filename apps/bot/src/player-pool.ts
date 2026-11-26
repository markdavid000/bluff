import { type Address, parseEther } from "viem";
import type { Log } from "./log";

export const NAMES = [
  "Baba Dice",
  "Mama Dice",
  "Oga Dice",
  "Iya Dice",
  "Chief Dice",
  "Aunty Dice",
  "Uncle Dice",
  "Bros Dice",
  "Sisi Dice",
  "Mazi Dice",
  "Alhaji Dice",
  "Madam Dice",
  "Prof Dice",
  "Mallam Dice",
  "Captain Dice",
  "Boss Dice",
  "Ada Dice",
  "Emeka Dice",
  "Tunde Dice",
  "Kemi Dice",
] as const;

export const SPARES = ["Femi Dice", "Ngozi Dice", "Bayo Dice", "Amaka Dice"] as const;

export const MOST_PLAYERS = NAMES.length + SPARES.length;
const BANK_FLOOR = parseEther("0.05");
const TOP_UP_BELOW = parseEther("0.01");
const TOP_UP_TO = parseEther("0.02");
const PRESET_FACES = 12;

export interface PoolChain {
  balanceOf(address: Address): Promise<bigint>;
  nicknameOf(address: Address): Promise<string>;
  isNicknameTaken(name: string, asker: Address): Promise<boolean>;
  tableOf(address: Address): Promise<bigint>;
  fund(to: Address, amount: bigint): Promise<void>;
  setProfile(index: number, name: string, avatar: number): Promise<void>;
}

export interface PoolPlayer {
  index: number;
  address: Address;
  name: string;
}

export type Acquired =
  { kind: "player"; player: PoolPlayer } | { kind: "all-busy" } | { kind: "resting" };

export function createPlayerPool({
  bank,
  players,
  chain,
  log,
}: {
  bank: Address;
  players: readonly Address[];
  chain: PoolChain;
  log: Log;
}) {
  const known = new Map<number, PoolPlayer>();
  const busy = new Set<number>();
  let readying: { index: number; done: Promise<void> } | null = null;

  function addressOf(index: number): Address {
    const address = players[index - 1];
    if (address === undefined) throw new Error(`There is no computer player ${index}`);
    return address;
  }

  function freeKnown(): number | null {
    for (const index of [...known.keys()].sort((a, b) => a - b)) {
      if (!busy.has(index)) return index;
    }
    return null;
  }

  function unused(): number | null {
    for (let index = 1; index <= players.length; index++) {
      if (!known.has(index) && !busy.has(index) && readying?.index !== index) return index;
    }
    return null;
  }

  function reserve(): number | null {
    const index = freeKnown() ?? unused();
    if (index !== null) busy.add(index);
    return index;
  }

  async function bankIsLow(): Promise<boolean> {
    return (await chain.balanceOf(bank)) < BANK_FLOOR;
  }

  async function topUp(address: Address) {
    const balance = await chain.balanceOf(address);
    if (balance >= TOP_UP_BELOW) return;
    await chain.fund(address, TOP_UP_TO - balance);
    log.info("topped up", { player: address, balance: (TOP_UP_TO - balance).toString() });
  }

  async function chooseName(index: number, address: Address): Promise<string> {
    const used = new Set([...known.values()].map((player) => player.name.toLowerCase()));
    const preferred = NAMES[index - 1];
    for (const name of preferred === undefined ? SPARES : [preferred, ...SPARES]) {
      if (used.has(name.toLowerCase())) continue;
      if (!(await chain.isNicknameTaken(name, address))) return name;
    }
    throw new Error(`No computer name is free for player ${index}`);
  }

  async function prepare(index: number): Promise<PoolPlayer> {
    const ready = known.get(index);
    if (ready) {
      await topUp(ready.address);
      return ready;
    }
    const address = addressOf(index);
    const saved = await chain.nicknameOf(address);
    await topUp(address);
    const name = saved === "" ? await chooseName(index, address) : saved;
    if (saved === "") {
      await chain.setProfile(index, name, ((index - 1) % PRESET_FACES) + 1);
      log.info("named", { player: address, reason: name });
    }
    const player = { index, address, name };
    known.set(index, player);
    return player;
  }

  async function readySpare(): Promise<void> {
    if (readying) return readying.done;
    if (freeKnown() !== null) return;
    const index = unused();
    if (index === null) return;
    const done = (async () => {
      try {
        if (await bankIsLow()) return;
        const player = await prepare(index);
        log.info("spare ready", { player: player.address });
      } catch (error) {
        log.warn("spare failed", { player: addressOf(index), error });
      }
    })().finally(() => {
      readying = null;
    });
    readying = { index, done };
    return done;
  }

  return {
    ensureSpare: readySpare,
    async acquire(): Promise<Acquired> {
      if (await bankIsLow()) {
        log.warn("bank low", { player: bank });
        return { kind: "resting" };
      }
      while (freeKnown() === null && readying !== null) await readying.done;
      const index = reserve();
      if (index === null) return { kind: "all-busy" };
      try {
        return { kind: "player", player: await prepare(index) };
      } catch (error) {
        busy.delete(index);
        throw error;
      }
    },
    release(index: number) {
      busy.delete(index);
    },
    owns(address: string): boolean {
      return players.some((player) => player.toLowerCase() === address.toLowerCase());
    },
    async finishGame(index: number): Promise<void> {
      const player = known.get(index);
      try {
        if (player) await topUp(player.address);
      } catch (error) {
        log.warn("top up failed", { player: player?.address, error });
      } finally {
        busy.delete(index);
      }
    },
    async resume(): Promise<{ player: PoolPlayer; tableId: bigint }[]> {
      const seated: { player: PoolPlayer; tableId: bigint }[] = [];
      for (let index = 1; index <= players.length; index++) {
        const address = addressOf(index);
        const name = await chain.nicknameOf(address);
        if (name === "") continue;
        const player = { index, address, name };
        known.set(index, player);
        const tableId = await chain.tableOf(address);
        if (tableId !== 0n) {
          busy.add(index);
          seated.push({ player, tableId });
        }
      }
      return seated;
    },
    known() {
      return [...known.values()]
        .sort((a, b) => a.index - b.index)
        .map((player) => ({ ...player, busy: busy.has(player.index) }));
    },
  };
}

export type PlayerPool = ReturnType<typeof createPlayerPool>;
