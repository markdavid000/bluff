import type { Table } from "@bluff/game";
import { type Address, formatEther } from "viem";
import { MoveRefused, TableMissing } from "./chain-errors";
import type { Log } from "./log";
import type { PlayerPool, PoolPlayer } from "./player-pool";
import { seatRefusal } from "./seat-policy";
import type { BluffCall } from "./seat-runner";
import type { Health, SeatReason, SeatResult, SeatService } from "./server";

export interface ServiceChain {
  readTable(id: bigint): Promise<Table>;
  send(index: number, call: BluffCall, atBlock?: bigint): Promise<{ blockNumber: bigint }>;
  balanceOf(address: Address): Promise<bigint>;
}

const NEW_TABLE_PATIENCE_MS = 15_000;
const NEW_TABLE_RETRY_MS = 3_000;

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
  async function readTable(id: bigint): Promise<Table | null> {
    for (let waited = 0; ; waited += NEW_TABLE_RETRY_MS) {
      try {
        return await chain.readTable(id);
      } catch (error) {
        if (!(error instanceof TableMissing)) throw error;
        if (waited >= NEW_TABLE_PATIENCE_MS) return null;
        await sleep(NEW_TABLE_RETRY_MS);
      }
    }
  }

  return {
    async seat(tableId): Promise<SeatResult> {
      const table = await readTable(tableId);
      if (table === null) return { kind: "refused", reason: "not-found" };
      const refusal = seatRefusal(table, now());
      if (refusal) return { kind: "refused", reason: refusal };
      const acquired = await pool.acquire();
      if (acquired.kind !== "player") return { kind: "refused", reason: acquired.kind };
      const { player } = acquired;
      let joined: { blockNumber: bigint };
      try {
        joined = await chain.send(player.index, { functionName: "joinFreeTable", args: [tableId] });
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
      startRunner(player, tableId, now(), joined.blockNumber);
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
