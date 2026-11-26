import { createChain } from "./chain";
import { createChainWatch } from "./chain-watch";
import { readConfig } from "./config";
import { createLog } from "./log";
import { type PoolPlayer, createPlayerPool } from "./player-pool";
import { createRunners } from "./runners";
import { type SeatRunner, createSeatRunner } from "./seat-runner";
import { createSeatService } from "./seat-service";
import { startServer } from "./server";
import { untilStarted } from "./startup";

const log = createLog();

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function main() {
  const config = readConfig(process.env);
  const { chain, bank, players } = createChain(config);
  const pool = createPlayerPool({ bank, players, chain, log });
  const runners = createRunners<SeatRunner>(log);

  function startRunner(player: PoolPlayer, tableId: bigint, seatedAt: number, seatedBlock: bigint) {
    runners.start(tableId, (finished) =>
      createSeatRunner({
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
          finished();
          void pool.finishGame(player.index);
        },
      })
    );
  }

  const resumedAt = await untilStarted("blockNumber", () => chain.blockNumber(), { sleep, log });
  const resumed = await untilStarted("resume", () => pool.resume(), { sleep, log });
  for (const { player, tableId } of resumed) {
    log.info("resumed", { table: tableId.toString(), player: player.address });
    startRunner(player, tableId, Date.now(), resumedAt);
  }
  void pool.ensureSpare();

  const watch = createChainWatch({
    chain,
    seated: runners.tables,
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

  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    log.info("stopping", { count: runners.count() });
    stopWatching();
    server.close();
  };
  process.once("SIGTERM", stop);
  process.once("SIGINT", stop);
}

main().catch((error: unknown) => {
  log.error("could not start", { error });
  process.exitCode = 1;
});
