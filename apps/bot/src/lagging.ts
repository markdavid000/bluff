import { BaseError, ResourceNotFoundRpcError } from "viem";

const CATCH_UP_TRIES = 3;
const CATCH_UP_WAIT_MS = 1_000;

export function checkBlock(atBlock: bigint | undefined, latest: bigint): bigint {
  return atBlock !== undefined && atBlock > latest ? atBlock : latest;
}

function isBehind(error: unknown): boolean {
  return (
    error instanceof BaseError &&
    error.walk((cause) => cause instanceof ResourceNotFoundRpcError) !== null
  );
}

export async function untilCaughtUp<T>(
  job: () => Promise<T>,
  sleep: (ms: number) => Promise<void>
): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    try {
      return await job();
    } catch (error) {
      if (!isBehind(error) || attempt >= CATCH_UP_TRIES) throw error;
      await sleep(CATCH_UP_WAIT_MS);
    }
  }
}
