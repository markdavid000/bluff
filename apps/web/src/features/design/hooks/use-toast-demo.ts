"use client";

import { useEffect, useRef, useState } from "react";
import type { ToastKind } from "@/components/shared/toast-tile";

export type DemoMessage = "success" | "bid" | "calledYou" | "youCalled" | "problem";

export interface DemoToast {
  id: number;
  message: DemoMessage;
}

export const DEMO_KIND: Record<DemoMessage, ToastKind> = {
  success: "success",
  bid: "info",
  calledYou: "info",
  youCalled: "info",
  problem: "error",
};

const STAYS_MS: Record<ToastKind, number | null> = {
  loading: null,
  success: 3000,
  info: 4000,
  error: null,
};

const MAX_VISIBLE = 3;

export function useToastDemo() {
  const [toasts, setToasts] = useState<DemoToast[]>([]);
  const nextId = useRef(1);
  const timers = useRef(new Map<number, number>());

  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach((timer) => window.clearTimeout(timer));
  }, []);

  function dismiss(id: number) {
    const timer = timers.current.get(id);
    if (timer !== undefined) window.clearTimeout(timer);
    timers.current.delete(id);
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }

  return {
    toasts,
    dismiss,
    show(message: DemoMessage) {
      const id = nextId.current++;
      setToasts((current) =>
        [{ id, message }, ...current.filter((toast) => toast.message !== message)].slice(
          0,
          MAX_VISIBLE
        )
      );
      const stays = STAYS_MS[DEMO_KIND[message]];
      if (stays !== null)
        timers.current.set(
          id,
          window.setTimeout(() => dismiss(id), stays)
        );
    },
  };
}
