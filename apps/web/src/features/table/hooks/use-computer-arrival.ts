"use client";

import { useEffect } from "react";
import { finishComputerCall, useComputerCall } from "@/hooks/use-computer-call";
import { notify } from "@/lib/notify";
import { type ArrivalTable, computerArrival } from "../lib/computer-arrival";

export const COMPUTER_ARRIVAL = "computer-arrival";

export function useComputerArrival(table: ArrivalTable | null) {
  const call = useComputerCall();
  const arrival = computerArrival(call, table);
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
