import { BaseError, InvalidParamsRpcError } from "viem";
import type { Log } from "./log";

const POLL_MS = 2_000;
export const SWEEP_MS = 10_000;
export const LOG_SPAN = 10n;
const BEHIND_NOTE_MS = 60_000;

export interface WatchChain {
  blockNumber(): Promise<bigint>;
  touchedTables(fromBlock: bigint, toBlock: bigint): Promise<bigint[]>;
}

export function createChainWatch({
  chain,
  seated,
  onTables,
  now,
  log,
}: {
  chain: WatchChain;
  seated: () => readonly bigint[];
  onTables: (ids: bigint[], head: bigint) => void | Promise<void>;
  now: () => number;
  log: Log;
}) {
  let lastBlock: bigint | null = null;
  let lastSweep = 0;
  let lastBehindNote: number | null = null;

  async function touchedSince(from: bigint, to: bigint): Promise<Set<bigint>> {
    const touched = new Set<bigint>();
    for (let start = from; start <= to; start += LOG_SPAN) {
      const end = start + LOG_SPAN - 1n < to ? start + LOG_SPAN - 1n : to;
      for (const id of await chain.touchedTables(start, end)) touched.add(id);
    }
    return touched;
  }

  async function poll(): Promise<void> {
    const tables = seated();
    if (tables.length === 0) {
      lastBlock = null;
      return;
    }
    const head = await chain.blockNumber();
    const sweep = lastBlock === null || now() - lastSweep >= SWEEP_MS;
    let ids: bigint[] = [];
    if (sweep) {
      ids = [...tables];
      lastSweep = now();
    } else if (lastBlock !== null && head > lastBlock) {
      let touched: Set<bigint>;
      try {
        touched = await touchedSince(lastBlock + 1n, head);
      } catch (error) {
        const behind =
          error instanceof BaseError &&
          error.walk((cause) => cause instanceof InvalidParamsRpcError) !== null;
        if (!behind) throw error;
        if (lastBehindNote === null || now() - lastBehindNote >= BEHIND_NOTE_MS) {
          lastBehindNote = now();
          log.info("search behind", { block: head.toString(), count: tables.length });
        }
        await onTables([...tables], head);
        return;
      }
      ids = tables.filter((id) => touched.has(id));
    }
    lastBlock = head;
    if (ids.length > 0) await onTables(ids, head);
  }

  return {
    poll,
    start(): () => void {
      let stopped = false;
      const loop = async () => {
        while (!stopped) {
          try {
            await poll();
          } catch (error) {
            log.warn("watch failed", { error });
          }
          await new Promise((resolve) => setTimeout(resolve, POLL_MS));
        }
      };
      void loop();
      return () => {
        stopped = true;
      };
    },
  };
}
