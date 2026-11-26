"use client";

import { useEffect, useEffectEvent, useRef, useState } from "react";
import { errorCopy } from "@/lib/copy";
import { explainProblem } from "@/lib/errors";
import { notify } from "@/lib/notify";
import type { MoveStep } from "./use-send-move";

export const SHOW_AFTER_MS = 300;
export const MIN_SHOWN_MS = 500;
export const BUSY_AFTER_MS = 15_000;

export type ActionStatus =
  { kind: "idle" } | { kind: MoveStep } | { kind: "done" } | { kind: "failed"; reason: string };

interface ActionOptions<Args extends unknown[], Result> {
  id: string;
  working: string;
  done?: string;
  quiet?: boolean;
  run: (report: (step: MoveStep) => void, ...args: Args) => Promise<Result>;
  onDone?: (result: Result) => void;
}

export function useAction<Args extends unknown[], Result = unknown>({
  id,
  working,
  done,
  quiet = false,
  run,
  onDone,
}: ActionOptions<Args, Result>) {
  const [status, setStatus] = useState<ActionStatus>({ kind: "idle" });
  const timers = useRef<number[]>([]);
  const shownAt = useRef<number | null>(null);
  const running = useRef(false);
  const here = useRef(false);
  const finishing = useRef<(() => void) | null>(null);

  function clearTimers() {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }

  const leave = useEffectEvent(() => {
    here.current = false;
    clearTimers();
    const finish = finishing.current;
    finishing.current = null;
    finish?.();
  });

  useEffect(() => {
    here.current = true;
    return () => leave();
  }, []);

  function afterMinimum(finish: () => void) {
    const elapsed = shownAt.current === null ? MIN_SHOWN_MS : Date.now() - shownAt.current;
    if (!here.current || elapsed >= MIN_SHOWN_MS) {
      finish();
      return;
    }
    finishing.current = finish;
    timers.current.push(
      window.setTimeout(() => {
        finishing.current = null;
        finish();
      }, MIN_SHOWN_MS - elapsed)
    );
  }

  async function start(...args: Args) {
    if (running.current) return;
    running.current = true;
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
      const result = await run((step) => setStatus({ kind: step }), ...args);
      clearTimers();
      afterMinimum(() => {
        running.current = false;
        if (!here.current) {
          if (shownAt.current !== null) notify.dismiss(id);
          return;
        }
        setStatus({ kind: "done" });
        if (!quiet && done) notify.success(done, { id });
        else if (shownAt.current !== null) notify.dismiss(id);
        onDone?.(result);
      });
    } catch (error) {
      clearTimers();
      const problem = explainProblem(error);
      if (problem.kind === "failed") console.error(`Action ${id} failed.`, error);
      afterMinimum(() => {
        running.current = false;
        if (here.current) setStatus({ kind: "failed", reason: problem.reason });
        if (problem.kind === "cancelled" || problem.kind === "unsure") {
          notify.info(problem.reason, { id });
        } else if (problem.kind === "refused" || !here.current) {
          notify.error(problem.reason, { id });
        } else {
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
