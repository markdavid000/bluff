"use client";

import { useState } from "react";
import { useCashOut } from "./use-cash-out";
import { useChipBalance } from "./use-chip-balance";
import { useClaimChips } from "./use-claim-chips";
import { usePendingCashOut } from "./use-pending-cash-out";

export function useChipsPanel() {
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const balance = useChipBalance();
  const claim = useClaimChips();
  const pending = usePendingCashOut();
  const cashOut = useCashOut({ onFinished: () => setCashOutOpen(false) });
  const unfinished = pending.data ?? null;

  return {
    balance,
    claim,
    cashOut,
    cashOutOpen,
    setCashOutOpen,
    canCashOut: balance.status === "ready" && balance.amount > 0n && unfinished === null,
    resume: unfinished ? () => cashOut.resume(unfinished) : null,
  };
}
