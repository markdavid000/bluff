import type { Table } from "@bluff/game";
import { type Address, formatEther } from "viem";
import { MoveRefused, MoveReverted, TableMissing } from "./chain-errors";
import type { Log } from "./log";
import type { PlayerPool, PoolPlayer } from "./player-pool";
import { seatRefusal } from "./seat-policy";
import type { Health, SeatReason, SeatResult, SeatService } from "./server";

export interface Seated {
  joinedBlock: bigint;
  readyBlock: bigint | null;
  readyProblem?: unknown;
}

export interface ServiceChain {
  blockNumber(): Promise<bigint>;
  readTable(id: bigint, atBlock?: bigint): Promise<Table>;
  joinAndReady(index: number, tableId: bigint, atBlock: bigint): Promise<Seated>;
  balanceOf(address: Address): Promise<bigint>;
  tableOf(address: Address): Promise<bigint>;
}

const NEW_TABLE_PATIENCE_MS = 15_000;
const NEW_TABLE_RETRY_MS = 3_000;
const JOIN_PATIENCE_MS = 15_000;
const JOIN_RETRY_MS = 1_000;
const SEAT_CHECKS = 3;
const SEAT_CHECK_RETRY_MS = 2_000;
const HEALTH_FRESH_MS = 30_000;
export const MOST_SEATING = 4;

const JOIN_REFUSALS: Record<string, SeatReason> = {
  TableFull: "full",
  WrongStatus: "not-waiting",
};

export function createSeatService({
  bank,
  chain,
  pool,
  startRunner,
  now,
  sleep,
  log,
}: {
  bank: Address;
  chain: ServiceChain;
  pool: PlayerPool;
  startRunner: (player: PoolPlayer, tableId: bigint, seatedAt: number, seatedBlock: bigint) => void;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  log: Log;
}): SeatService {
  const seating = new Map<bigint, Promise<SeatResult>>();
  let lastHealth: { at: number; value: Health } | null = null;

  async function readTable(id: bigint): Promise<{ table: Table; block: bigint } | null> {
    const startedAt = now();
    for (;;) {
      const block = await chain.blockNumber();
      try {
        return { table: await chain.readTable(id, block), block };
      } catch (error) {
        if (!(error instanceof TableMissing)) throw error;
        if (now() - startedAt >= NEW_TABLE_PATIENCE_MS) return null;
        await sleep(NEW_TABLE_RETRY_MS);
      }
    }
  }

  async function join(index: number, tableId: bigint, firstBlock: bigint) {
    const startedAt = now();
    let block = firstBlock;
    for (;;) {
      try {
        return await chain.joinAndReady(index, tableId, block);
      } catch (error) {
        const settled = error instanceof MoveRefused || error instanceof MoveReverted;
        if (settled || now() - startedAt >= JOIN_PATIENCE_MS) throw error;
        log.warn("join retried", { table: tableId.toString(), ms: now() - startedAt, error });
        await sleep(JOIN_RETRY_MS);
        const newest = await chain.blockNumber();
        if (newest > block) block = newest;
      }
    }
  }

  async function whereSeated(player: PoolPlayer): Promise<bigint> {
    for (let check = 1; ; check++) {
      try {
        return await chain.tableOf(player.address);
      } catch (error) {
        if (check >= SEAT_CHECKS) throw error;
        await sleep(SEAT_CHECK_RETRY_MS);
      }
    }
  }

  async function reasonAfterRevert(tableId: bigint): Promise<SeatReason | undefined> {
    const table = await chain.readTable(tableId);
    if (table.status !== "waiting") return "not-waiting";
    return table.seats.length >= table.seatCount ? "full" : undefined;
  }

  async function afterFailedJoin(
    player: PoolPlayer,
    tableId: bigint,
    error: unknown
  ): Promise<SeatResult> {
    const at = await whereSeated(player);
    if (at !== 0n) {
      log.warn("seated despite a failed join", {
        table: at.toString(),
        player: player.address,
        error,
      });
      startRunner(player, at, now(), await chain.blockNumber());
      return at === tableId
        ? { kind: "seated", player: player.address }
        : { kind: "refused", reason: "all-busy" };
    }
    pool.release(player.index);
    const reason =
      error instanceof MoveRefused
        ? JOIN_REFUSALS[error.errorName]
        : error instanceof MoveReverted
          ? await reasonAfterRevert(tableId)
          : undefined;
    if (reason === undefined) throw error;
    log.info("join refused", {
      table: tableId.toString(),
      player: player.address,
      reason: error instanceof MoveRefused ? error.errorName : reason,
    });
    return { kind: "refused", reason };
  }

  async function seatAt(tableId: bigint): Promise<SeatResult> {
    const found = await readTable(tableId);
    if (found === null) return { kind: "refused", reason: "not-found" };
    const ours = found.table.seats.find((seat) => pool.owns(seat.player));
    if (ours) return { kind: "seated", player: ours.player };
    const refusal = seatRefusal(found.table, now());
    if (refusal) return { kind: "refused", reason: refusal };
    const acquired = await pool.acquire();
    if (acquired.kind !== "player") return { kind: "refused", reason: acquired.kind };
    const { player } = acquired;
    void pool.ensureSpare();
    let joined: Seated;
    try {
      joined = await join(player.index, tableId, found.block);
    } catch (error) {
      return afterFailedJoin(player, tableId, error);
    }
    if (joined.readyBlock === null) {
      log.warn("ready failed", {
        table: tableId.toString(),
        player: player.address,
        error: joined.readyProblem,
      });
    }
    startRunner(player, tableId, now(), joined.readyBlock ?? joined.joinedBlock);
    return { kind: "seated", player: player.address };
  }

  async function readHealth(): Promise<Health> {
    const players = await Promise.all(
      pool.known().map(async (player) => ({
        address: player.address,
        name: player.name,
        busy: player.busy,
        balance: formatEther(await chain.balanceOf(player.address)),
      }))
    );
    return {
      bank: { address: bank, balance: formatEther(await chain.balanceOf(bank)) },
      players,
    };
  }

  return {
    seat(tableId): Promise<SeatResult> {
      const already = seating.get(tableId);
      if (already) return already;
      if (seating.size >= MOST_SEATING) {
        return Promise.resolve({ kind: "refused", reason: "all-busy" });
      }
      const attempt = seatAt(tableId).finally(() => seating.delete(tableId));
      seating.set(tableId, attempt);
      return attempt;
    },
    async health(): Promise<Health> {
      if (lastHealth && now() - lastHealth.at < HEALTH_FRESH_MS) return lastHealth.value;
      try {
        lastHealth = { at: now(), value: await readHealth() };
        return lastHealth.value;
      } catch (error) {
        if (lastHealth === null) throw error;
        log.warn("health stale", { error });
        return lastHealth.value;
      }
    },
  };
}
