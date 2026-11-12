"use client";

import { useEffect, useRef, useState } from "react";
import { errorCopy } from "@/lib/copy";
import { explainProblem } from "@/lib/errors";
import { notify } from "@/lib/notify";
import type { MoveStep } from "./use-send-move";

export const SHOW_AFTER_MS = 300;
export const MIN_SHOWN_MS = 500;
export const BUSY_AFTER_MS = 15_000;

export type ActionStatus =
  { kind: "idle" } | { kind: MoveStep } | { kind: "done" } | { kind: "failed"; reason: string };

interface ActionOptions<Args extends unknown[]> {
  id: string;
  working: string;
  done?: string;
  quiet?: boolean;
  run: (report: (step: MoveStep) => void, ...args: Args) => Promise<unknown>;
  onDone?: () => void;
}

export function useAction<Args extends unknown[]>({
  id,
  working,
  done,
  quiet = false,
  run,
  onDone,
}: ActionOptions<Args>) {
  const [status, setStatus] = useState<ActionStatus>({ kind: "idle" });
  const timers = useRef<number[]>([]);
  const shownAt = useRef<number | null>(null);

  function clearTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  useEffect(() => clearTimers, []);

  function afterMinimum(finish: () => void) {
    const elapsed = shownAt.current === null ? MIN_SHOWN_MS : Date.now() - shownAt.current;
    if (elapsed >= MIN_SHOWN_MS) finish();
    else timers.current.push(window.setTimeout(finish, MIN_SHOWN_MS - elapsed));
  }

  async function start(...args: Args) {
    clearTimers();
    shownAt.current = null;
    setStatus({ kind: "preparing" });
    if (!quiet) {
      timers.current.push(
        window.setTimeout(() => {
          shownAt.current = Date.now();
          notify.loading(working, { id });
        }, SHOW_AFTER_MS),
        window.setTimeout(
          () => notify.loading(errorCopy.stillWorking(working), { id }),
          BUSY_AFTER_MS
        )
      );
    }
    try {
      await run((step) => setStatus({ kind: step }), ...args);
      clearTimers();
      afterMinimum(() => {
        setStatus({ kind: "done" });
        if (!quiet && done) notify.success(done, { id });
        else if (shownAt.current !== null) notify.dismiss(id);
        onDone?.();
      });
    } catch (error) {
      clearTimers();
      const problem = explainProblem(error);
      if (problem.kind === "failed") console.error(`Action ${id} failed.`, error);
      afterMinimum(() => {
        setStatus({ kind: "failed", reason: problem.reason });
        if (problem.kind === "cancelled") notify.info(problem.reason, { id });
        else {
          notify.error(problem.reason, {
            id,
            action: { label: errorCopy.tryAgain, onPress: () => void start(...args) },
          });
        }
      });
    }
  }

  const isWorking =
    status.kind === "preparing" ||
    status.kind === "confirming" ||
    status.kind === "sending" ||
    status.kind === "waiting";

  return {
    status,
    working: isWorking,
    confirmInWallet: status.kind === "confirming",
    start: (...args: Args) => void start(...args),
  };
}
