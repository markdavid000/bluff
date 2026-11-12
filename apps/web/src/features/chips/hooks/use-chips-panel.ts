"use client";

import { useState } from "react";
import { useChipBalance } from "@/hooks/use-chip-balance";
import { chipsCopy } from "../copy";
import { useCashOut } from "./use-cash-out";
import { useClaimChips } from "./use-claim-chips";
import { usePendingCashOut } from "./use-pending-cash-out";

export function useChipsPanel() {
  const [cashOutOpen, setCashOutOpen] = useState(false);
  const balance = useChipBalance({ working: chipsCopy.showingChips });
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
