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
  const checked = pending.data !== undefined;
  const unfinished = pending.data ?? null;
  if (unfinished !== null && cashOutOpen) setCashOutOpen(false);

  return {
    balance,
    claim,
    cashOut,
    cashOutOpen,
    setCashOutOpen,
    canCashOut: balance.status === "ready" && balance.amount > 0n && checked && unfinished === null,
    pendingRetry: !checked && pending.isError ? () => void pending.refetch() : null,
    resume: unfinished ? () => cashOut.resume(unfinished) : null,
  };
}
