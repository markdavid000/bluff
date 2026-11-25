import type { Table } from "@bluff/game";
import { type Address, formatEther } from "viem";
import { MoveRefused, TableMissing } from "./chain-errors";
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
}

const NEW_TABLE_PATIENCE_MS = 15_000;
const NEW_TABLE_RETRY_MS = 1_000;

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
  async function readTable(id: bigint): Promise<{ table: Table; block: bigint } | null> {
    for (let waited = 0; ; waited += NEW_TABLE_RETRY_MS) {
      const block = await chain.blockNumber();
      try {
        return { table: await chain.readTable(id, block), block };
      } catch (error) {
        if (!(error instanceof TableMissing)) throw error;
        if (waited >= NEW_TABLE_PATIENCE_MS) return null;
        await sleep(NEW_TABLE_RETRY_MS);
      }
    }
  }

  async function join(index: number, tableId: bigint, block: bigint) {
    for (let waited = 0; ; waited += NEW_TABLE_RETRY_MS) {
      try {
        return await chain.joinAndReady(index, tableId, block);
      } catch (error) {
        if (error instanceof MoveRefused || waited >= NEW_TABLE_PATIENCE_MS) throw error;
        log.warn("join retried", { table: tableId.toString(), ms: waited, error });
        await sleep(NEW_TABLE_RETRY_MS);
      }
    }
  }

  return {
    async seat(tableId): Promise<SeatResult> {
      const found = await readTable(tableId);
      if (found === null) return { kind: "refused", reason: "not-found" };
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
        pool.release(player.index);
        const reason = error instanceof MoveRefused ? JOIN_REFUSALS[error.errorName] : undefined;
        if (reason === undefined) throw error;
        log.info("join refused", {
          table: tableId.toString(),
          player: player.address,
          reason: error instanceof MoveRefused ? error.errorName : "",
        });
        return { kind: "refused", reason };
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
    },
    async health(): Promise<Health> {
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
    },
  };
}
