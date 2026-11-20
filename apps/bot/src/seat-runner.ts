import { type KeeperAction, type Table, keeperDuty } from "@bluff/game";
import type { Address, Hex } from "viem";
import type { Log } from "./log";
import { facesFrom } from "./own-dice";
import { seatIntent } from "./seat-intent";
import { chooseMove } from "./strategy";

const THINKING_MS = { least: 2_000, most: 6_000 } as const;
const TURN_MARGIN_MS = 15_000;
const RETRY_MS = 3_000;
const REVEAL_PATIENCE_MS = 45_000;

export type BluffCall =
  | { functionName: "setReady"; args: readonly [bigint, boolean] }
  | { functionName: "placeBid"; args: readonly [bigint, number, number] }
  | {
      functionName:
        | "joinFreeTable"
        | "leaveTable"
        | "callBluff"
        | "claimTimeout"
        | "cancelStuckReveal"
        | "cancelTable"
        | "cancelVerification";
      args: readonly [bigint];
    }
  | { functionName: "settleReveal" | "confirmSeats"; args: readonly [bigint, Hex, Hex] };

export interface SeatChain {
  readTable(id: bigint, atBlock?: bigint): Promise<Table>;
  send(index: number, call: BluffCall, atBlock?: bigint): Promise<{ blockNumber: bigint }>;
  ownDice(index: number, id: bigint, timeoutMs: number): Promise<readonly unknown[]>;
  revealProof(id: bigint, timeoutMs: number): Promise<{ clearValues: Hex; proof: Hex }>;
}

function turnKey(table: Table): string {
  return `${table.round}:${table.turn}:${table.bid?.quantity ?? 0}:${table.bid?.face ?? 0}`;
}

export function createSeatRunner({
  index,
  address,
  tableId,
  seatedAt,
  seatedBlock,
  chain,
  log,
  random,
  now,
  sleep,
  onDone,
}: {
  index: number;
  address: Address;
  tableId: bigint;
  seatedAt: number;
  seatedBlock: bigint;
  chain: SeatChain;
  log: Log;
  random: () => number;
  now: () => number;
  sleep: (ms: number) => Promise<void>;
  onDone: () => void;
}) {
  const table = tableId.toString();
  let newestBlock = seatedBlock;
  let actedOn = "";
  let attempting = "";
  let finished = false;
  let running: Promise<void> | null = null;
  let again = false;

  function notice(block?: bigint) {
    if (block !== undefined && block > newestBlock) newestBlock = block;
  }

  function read() {
    return chain.readTable(tableId, newestBlock > 0n ? newestBlock : undefined);
  }

  async function send(call: BluffCall) {
    attempting = call.functionName;
    const receipt = await chain.send(index, call, newestBlock > 0n ? newestBlock : undefined);
    attempting = "";
    if (receipt.blockNumber > newestBlock) newestBlock = receipt.blockNumber;
    log.info("moved", {
      table,
      player: address,
      action: call.functionName,
      block: receipt.blockNumber.toString(),
    });
  }

  async function ownFaces(deadline: number) {
    for (;;) {
      const timeLeft = deadline - TURN_MARGIN_MS - now();
      try {
        return facesFrom(await chain.ownDice(index, tableId, Math.max(timeLeft, RETRY_MS)));
      } catch (error) {
        log.warn("dice not ready", { table, player: address, ms: timeLeft, error });
        if (now() + RETRY_MS > deadline - TURN_MARGIN_MS) {
          log.warn("turn lapsed", {
            table,
            player: address,
            reason: "dice could not be read",
            error,
          });
          return null;
        }
        await sleep(RETRY_MS);
      }
    }
  }

  async function takeTurn(current: Table, deadline: number) {
    const key = turnKey(current);
    if (key === actedOn) return;
    const thinking = THINKING_MS.least + random() * (THINKING_MS.most - THINKING_MS.least);
    log.info("thinking", { table, player: address, ms: deadline - now() });
    await sleep(Math.max(0, Math.min(thinking, deadline - now() - TURN_MARGIN_MS)));
    const faces = await ownFaces(deadline);
    if (faces === null) {
      actedOn = key;
      return;
    }
    const fresh = await read();
    const stillMine = seatIntent(fresh, address, now(), seatedAt);
    if (stillMine.kind !== "turn" || turnKey(fresh) !== key) return;
    const move = chooseMove(
      {
        bid: fresh.bid && { quantity: fresh.bid.quantity, face: fresh.bid.face },
        diceInPlay: fresh.diceInPlay,
        ownFaces: faces,
      },
      random
    );
    await send(
      move.kind === "call"
        ? { functionName: "callBluff", args: [tableId] }
        : { functionName: "placeBid", args: [tableId, move.bid.quantity, move.bid.face] }
    );
    actedOn = key;
  }

  async function stillDue(action: KeeperAction): Promise<boolean> {
    return keeperDuty(await read(), now(), address)?.action === action;
  }

  async function revealProof(action: KeeperAction) {
    const until = now() + REVEAL_PATIENCE_MS;
    for (;;) {
      const timeLeft = until - now();
      try {
        return await chain.revealProof(tableId, Math.max(timeLeft, RETRY_MS));
      } catch (error) {
        log.warn("reveal not ready", { table, player: address, ms: timeLeft, error });
        if (!(await stillDue(action))) return null;
        if (now() + RETRY_MS > until) throw error;
        await sleep(RETRY_MS);
      }
    }
  }

  async function keep(current: Table) {
    const duty = keeperDuty(current, now(), address);
    if (!duty || duty.dueAt > now()) return;
    if (duty.action === "settleReveal" || duty.action === "confirmSeats") {
      const revealed = await revealProof(duty.action);
      if (revealed === null || !(await stillDue(duty.action))) return;
      await send({
        functionName: duty.action,
        args: [tableId, revealed.clearValues, revealed.proof],
      });
      return;
    }
    await send({ functionName: duty.action, args: [tableId] });
  }

  async function step() {
    if (finished) return;
    const current = await read();
    const intent = seatIntent(current, address, now(), seatedAt);
    switch (intent.kind) {
      case "done":
        finished = true;
        log.info("seat over", { table, player: address, reason: current.status });
        onDone();
        return;
      case "ready":
        await send({ functionName: "setReady", args: [tableId, true] });
        return;
      case "leave":
        await send({ functionName: "leaveTable", args: [tableId] });
        log.info("left", { table, player: address, reason: intent.reason });
        return;
      case "turn":
        await takeTurn(current, intent.deadline);
        return;
      case "keep":
        await keep(current);
        return;
      case "wait":
        return;
    }
  }

  async function run() {
    try {
      await step();
    } catch (error) {
      log.warn("move failed", {
        table,
        player: address,
        action: attempting || "reading the table",
        error,
      });
      attempting = "";
    }
  }

  return {
    async update(atBlock?: bigint): Promise<void> {
      notice(atBlock);
      if (running) {
        again = true;
        return running;
      }
      running = (async () => {
        await run();
        while (again) {
          again = false;
          await run();
        }
      })();
      try {
        await running;
      } finally {
        running = null;
      }
    },
    isDone: () => finished,
  };
}

export type SeatRunner = ReturnType<typeof createSeatRunner>;
