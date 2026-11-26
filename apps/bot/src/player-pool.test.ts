import type { Address } from "viem";
import { parseEther } from "viem";
import { describe, expect, it } from "vitest";
import { createLog } from "./log";
import { NAMES, SPARES, type PoolChain, createPlayerPool } from "./player-pool";

const BANK = "0x00000000000000000000000000000000000000b0" as Address;
const player = (index: number) => `0x${index.toString(16).padStart(40, "0")}` as Address;

function fakeChain({ bank = parseEther("1"), taken = [] as string[] } = {}) {
  const balances = new Map<Address, bigint>([[BANK, bank]]);
  const names = new Map<Address, string>();
  const tables = new Map<Address, bigint>();
  const calls: string[] = [];
  const chain: PoolChain = {
    balanceOf: async (address) => balances.get(address) ?? 0n,
    nicknameOf: async (address) => names.get(address) ?? "",
    isNicknameTaken: async (name, asker) =>
      taken.includes(name.toLowerCase()) ||
      [...names].some(
        ([owner, used]) => owner !== asker && used.toLowerCase() === name.toLowerCase()
      ),
    tableOf: async (address) => tables.get(address) ?? 0n,
    fund: async (to, amount) => {
      calls.push(`fund ${to} ${amount}`);
      balances.set(BANK, (balances.get(BANK) ?? 0n) - amount);
      balances.set(to, (balances.get(to) ?? 0n) + amount);
    },
    setProfile: async (index, name, avatar) => {
      calls.push(`profile ${index} ${name} ${avatar}`);
      names.set(player(index), name);
    },
  };
  return { chain, balances, names, tables, calls };
}

function pool(chain: PoolChain, maxPlayers = 3, lines: string[] = []) {
  return createPlayerPool({
    bank: BANK,
    players: Array.from({ length: maxPlayers }, (_, i) => player(i + 1)),
    chain,
    log: createLog((line) => void lines.push(line)),
  });
}

function held() {
  let release = () => undefined as void;
  const gate = new Promise<void>((resolve) => {
    release = resolve;
  });
  return { gate, release: () => release() };
}

describe("player pool", () => {
  it("has 20 names and 4 spares, all valid and different", () => {
    expect(NAMES).toHaveLength(20);
    expect(SPARES).toHaveLength(4);
    const all = [...NAMES, ...SPARES];
    expect(new Set(all.map((name) => name.toLowerCase())).size).toBe(24);
    for (const name of all) expect(name).toMatch(/^[A-Za-z0-9 _-]{3,20}$/);
  });

  it("brings in the first player when nobody has played yet: funds it, names it, gives it a face", async () => {
    const fake = fakeChain();
    const result = await pool(fake.chain).acquire();
    expect(result).toEqual({
      kind: "player",
      player: { index: 1, address: player(1), name: "Baba Dice" },
    });
    expect(fake.calls).toEqual([
      `fund ${player(1)} ${parseEther("0.02")}`,
      "profile 1 Baba Dice 1",
    ]);
  });

  it("reuses a free player before bringing in another", async () => {
    const fake = fakeChain();
    const players = pool(fake.chain);
    const first = await players.acquire();
    if (first.kind !== "player") throw new Error("expected a player");
    players.release(first.player.index);
    fake.calls.length = 0;
    expect(await players.acquire()).toEqual(first);
    expect(fake.calls).toEqual([]);
  });

  it("brings in the next player when every player is busy, up to the cap", async () => {
    const fake = fakeChain();
    const players = pool(fake.chain, 2);
    const names = [];
    for (let i = 0; i < 2; i++) {
      const result = await players.acquire();
      if (result.kind === "player") names.push(result.player.name);
    }
    expect(names).toEqual(["Baba Dice", "Mama Dice"]);
    expect(await players.acquire()).toEqual({ kind: "all-busy" });
  });

  it("never hands the same player to two requests at once", async () => {
    const players = pool(fakeChain().chain, 3);
    const results = await Promise.all([players.acquire(), players.acquire(), players.acquire()]);
    const indexes = results.map((result) =>
      result.kind === "player" ? result.player.index : null
    );
    expect(new Set(indexes)).toEqual(new Set([1, 2, 3]));
  });

  it("tops a player up before it sits down when it's running low", async () => {
    const fake = fakeChain();
    const players = pool(fake.chain);
    const first = await players.acquire();
    if (first.kind !== "player") throw new Error("expected a player");
    players.release(first.player.index);
    fake.balances.set(player(1), parseEther("0.004"));
    fake.calls.length = 0;
    await players.acquire();
    expect(fake.calls).toEqual([`fund ${player(1)} ${parseEther("0.016")}`]);
  });

  it("rests, seating nobody, while the bank is low, and says so", async () => {
    const fake = fakeChain({ bank: parseEther("0.049") });
    expect(await pool(fake.chain).acquire()).toEqual({ kind: "resting" });
    expect(fake.calls).toEqual([]);
  });

  it("uses the next spare when a real player has already taken a computer's name", async () => {
    const fake = fakeChain({ taken: ["baba dice"] });
    const result = await pool(fake.chain).acquire();
    expect(result).toMatchObject({ kind: "player", player: { name: SPARES[0] } });
  });

  it("keeps a name a player was already given", async () => {
    const fake = fakeChain();
    fake.names.set(player(1), "Baba Dice");
    fake.balances.set(player(1), parseEther("0.02"));
    const result = await pool(fake.chain).acquire();
    expect(result).toMatchObject({ kind: "player", player: { name: "Baba Dice" } });
    expect(fake.calls).toEqual([]);
  });

  it("finds players already at a table after a restart, so their games carry on", async () => {
    const fake = fakeChain();
    for (const index of [1, 2]) {
      fake.names.set(player(index), NAMES[index - 1] ?? "");
      fake.balances.set(player(index), parseEther("0.02"));
    }
    fake.tables.set(player(2), 77n);
    const players = pool(fake.chain);
    expect(await players.resume()).toEqual([
      { player: { index: 2, address: player(2), name: "Mama Dice" }, tableId: 77n },
    ]);
    expect(await players.acquire()).toMatchObject({ kind: "player", player: { index: 1 } });
    expect(await players.acquire()).toMatchObject({
      kind: "player",
      player: { index: 3, name: "Oga Dice" },
    });
  });

  describe("keeping a computer ready", () => {
    it("sets up the next computer ahead of time when none is free", async () => {
      const fake = fakeChain();
      const lines: string[] = [];
      const players = pool(fake.chain, 3, lines);
      await players.ensureSpare();
      expect(fake.calls).toEqual([
        `fund ${player(1)} ${parseEther("0.02")}`,
        "profile 1 Baba Dice 1",
      ]);
      expect(players.known()).toEqual([
        { index: 1, address: player(1), name: "Baba Dice", busy: false },
      ]);
      expect(lines.some((line) => line.includes('"spare ready"'))).toBe(true);
    });

    it("lets the next request take the ready computer with nothing left to set up", async () => {
      const fake = fakeChain();
      const players = pool(fake.chain);
      await players.ensureSpare();
      fake.calls.length = 0;
      expect(await players.acquire()).toMatchObject({ kind: "player", player: { index: 1 } });
      expect(fake.calls).toEqual([]);
    });

    it("leaves things alone while a computer is already free", async () => {
      const fake = fakeChain();
      const players = pool(fake.chain);
      await players.ensureSpare();
      fake.calls.length = 0;
      await players.ensureSpare();
      expect(fake.calls).toEqual([]);
    });

    it("sets up one computer at a time, however often it's asked", async () => {
      const fake = fakeChain();
      const players = pool(fake.chain);
      await Promise.all([players.ensureSpare(), players.ensureSpare(), players.ensureSpare()]);
      expect(fake.calls.filter((call) => call.startsWith("profile"))).toEqual([
        "profile 1 Baba Dice 1",
      ]);
    });

    it("makes a request wait for the computer being set up, rather than set up another", async () => {
      const fake = fakeChain();
      const { gate, release } = held();
      const setProfile = fake.chain.setProfile;
      fake.chain.setProfile = async (index, name, avatar) => {
        await gate;
        await setProfile(index, name, avatar);
      };
      const players = pool(fake.chain);
      const spare = players.ensureSpare();
      const request = players.acquire();
      release();
      await spare;
      expect(await request).toMatchObject({ kind: "player", player: { index: 1 } });
      expect(fake.calls.filter((call) => call.startsWith("profile"))).toEqual([
        "profile 1 Baba Dice 1",
      ]);
    });

    it("says when setting up fails, and still seats the next request", async () => {
      const fake = fakeChain();
      const lines: string[] = [];
      const setProfile = fake.chain.setProfile;
      let failures = 1;
      fake.chain.setProfile = async (index, name, avatar) => {
        if (failures-- > 0) throw new Error("The network is slow.");
        await setProfile(index, name, avatar);
      };
      const players = pool(fake.chain, 3, lines);
      await players.ensureSpare();
      expect(lines.some((line) => line.includes('"spare failed"'))).toBe(true);
      expect(await players.acquire()).toMatchObject({ kind: "player" });
    });

    it("says when it can't read the bank, without failing", async () => {
      const fake = fakeChain();
      const lines: string[] = [];
      fake.chain.balanceOf = async () => Promise.reject(new Error("rpc down"));
      await expect(pool(fake.chain, 3, lines).ensureSpare()).resolves.toBeUndefined();
      expect(lines.some((line) => line.includes('"spare failed"'))).toBe(true);
    });

    it("sets nothing up while the bank is low", async () => {
      const fake = fakeChain({ bank: parseEther("0.049") });
      await pool(fake.chain).ensureSpare();
      expect(fake.calls).toEqual([]);
    });

    it("sets nothing up once every computer is playing", async () => {
      const fake = fakeChain();
      const players = pool(fake.chain, 1);
      await players.acquire();
      fake.calls.length = 0;
      await players.ensureSpare();
      expect(fake.calls).toEqual([]);
    });

    it("refills a computer's gas after its game, so the next request doesn't wait for it", async () => {
      const fake = fakeChain();
      const players = pool(fake.chain);
      const first = await players.acquire();
      if (first.kind !== "player") throw new Error("expected a player");
      fake.balances.set(player(1), parseEther("0.004"));
      fake.calls.length = 0;
      await players.finishGame(first.player.index);
      expect(fake.calls).toEqual([`fund ${player(1)} ${parseEther("0.016")}`]);
      expect(players.known()).toMatchObject([{ index: 1, busy: false }]);
      fake.calls.length = 0;
      await players.acquire();
      expect(fake.calls).toEqual([]);
    });
  });

  it("resumes a seated computer even when one before it was never named", async () => {
    const fake = fakeChain();
    fake.names.set(player(1), "Baba Dice");
    fake.names.set(player(3), "Oga Dice");
    fake.tables.set(player(3), 77n);
    const players = pool(fake.chain);
    expect(await players.resume()).toEqual([
      { player: { index: 3, address: player(3), name: "Oga Dice" }, tableId: 77n },
    ]);
  });

  it("knows its own computers from anyone else", () => {
    const players = pool(fakeChain().chain);
    expect(players.owns(player(2).toUpperCase().replace("0X", "0x"))).toBe(true);
    expect(players.owns(BANK)).toBe(false);
    expect(players.owns("0x0000000000000000000000000000000000009f9f")).toBe(false);
  });

  it("reports each player it knows and whether it's playing, for the health check", async () => {
    const players = pool(fakeChain().chain);
    await players.acquire();
    expect(players.known()).toEqual([
      { index: 1, address: player(1), name: "Baba Dice", busy: true },
    ]);
  });
});
