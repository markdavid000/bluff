import type { Log } from "./log";

export const STARTUP_WAITS_MS = [2_000, 5_000, 10_000, 30_000] as const;

export async function untilStarted<T>(
  action: string,
  job: () => Promise<T>,
  { sleep, log }: { sleep: (ms: number) => Promise<void>; log: Log }
): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await job();
    } catch (error) {
      const wait = STARTUP_WAITS_MS[Math.min(attempt, STARTUP_WAITS_MS.length - 1)];
      log.warn("start delayed", { action, ms: wait, error });
      await sleep(wait);
    }
  }
}
