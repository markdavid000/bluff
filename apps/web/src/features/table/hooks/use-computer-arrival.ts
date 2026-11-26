"use client";

import { useEffect } from "react";
import { finishComputerCall, useComputerCall } from "@/hooks/use-computer-call";
import { useNow } from "@/hooks/use-now";
import { notify } from "@/lib/notify";
import { type ArrivalTable, computerArrival } from "../lib/computer-arrival";

export const COMPUTER_ARRIVAL = "computer-arrival";
const TICK_MS = 1_000;

export function useComputerArrival(table: ArrivalTable | null) {
  const call = useComputerCall();
  const now = useNow(TICK_MS, call !== null && call.answeredAt !== null);
  const arrival = computerArrival(call, table, now);
  const tableId = table?.id ?? null;
  const kind = arrival.kind;
  const message = arrival.kind === "working" || arrival.kind === "refused" ? arrival.message : "";

  useEffect(() => {
    if (tableId === null) return;
    if (kind === "working") notify.loading(message, { id: COMPUTER_ARRIVAL });
    if (kind === "refused") {
      notify.info(message, { id: COMPUTER_ARRIVAL });
      finishComputerCall(tableId);
    }
    if (kind === "arrived") {
      notify.dismiss(COMPUTER_ARRIVAL);
      finishComputerCall(tableId);
    }
  }, [kind, message, tableId]);

  const showing = kind === "working";
  useEffect(() => {
    if (!showing) return;
    return () => notify.dismiss(COMPUTER_ARRIVAL);
  }, [showing]);

  return { computerComing: showing };
}
