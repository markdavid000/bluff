import { createChain } from "./chain";
import { createChainWatch } from "./chain-watch";
import { readConfig } from "./config";
import { createLog } from "./log";
import { type PoolPlayer, createPlayerPool } from "./player-pool";
import { type SeatRunner, createSeatRunner } from "./seat-runner";
import { createSeatService } from "./seat-service";
import { startServer } from "./server";

const log = createLog();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = readConfig(process.env);
  const { chain, bank, players } = createChain(config);
  const pool = createPlayerPool({ bank, players, chain, log });
  const runners = new Map<bigint, SeatRunner>();

  function startRunner(player: PoolPlayer, tableId: bigint, seatedAt: number, seatedBlock: bigint) {
    const runner = createSeatRunner({
      index: player.index,
      address: player.address,
      tableId,
      seatedAt,
      seatedBlock,
      chain,
      log,
      random: Math.random,
      now: Date.now,
      sleep,
      onDone: () => {
        runners.delete(tableId);
        pool.release(player.index);
      },
    });
    runners.set(tableId, runner);
    void runner.update();
  }

  const resumedAt = await chain.blockNumber();
  for (const { player, tableId } of await pool.resume()) {
    log.info("resumed", { table: tableId.toString(), player: player.address });
    startRunner(player, tableId, Date.now(), resumedAt);
  }

  const watch = createChainWatch({
    chain,
    seated: () => [...runners.keys()],
    onTables: (ids, head) => {
      for (const id of ids) void runners.get(id)?.update(head);
    },
    now: Date.now,
    log,
  });
  const stopWatching = watch.start();

  const service = createSeatService({
    bank,
    chain,
    pool,
    startRunner,
    now: Date.now,
    sleep,
    log,
  });
  const server = await startServer({
    port: config.port,
    service,
    allowedOrigins: config.allowedOrigins,
    log,
  });
  log.info("started", { player: bank, count: players.length });

  process.once("SIGTERM", () => {
    log.info("stopping", { count: runners.size });
    stopWatching();
    server.close();
  });
}

main().catch((error: unknown) => {
  log.error("could not start", { error });
  process.exitCode = 1;
});
