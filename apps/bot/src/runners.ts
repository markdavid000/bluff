import type { Log } from "./log";

interface Runner {
  update(head?: bigint): Promise<void>;
}

export function createRunners<R extends Runner>(log: Log) {
  const runners = new Map<bigint, R>();
  return {
    start(tableId: bigint, create: (finished: () => void) => R) {
      if (runners.has(tableId)) {
        log.warn("already playing", { table: tableId.toString() });
        return;
      }
      const runner = create(() => runners.delete(tableId));
      runners.set(tableId, runner);
      void runner.update();
    },
    get: (tableId: bigint) => runners.get(tableId),
    tables: () => [...runners.keys()],
    count: () => runners.size,
  };
}
