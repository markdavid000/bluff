import { STEP_SECONDS } from "@/lib/dice-geometry";

export function rollFrame(elapsedMs: number, frames: number): { index: number; done: boolean } {
  const last = frames - 1;
  const step = Math.floor(elapsedMs / 1000 / STEP_SECONDS);
  return { index: Math.min(step, last), done: step >= last };
}
