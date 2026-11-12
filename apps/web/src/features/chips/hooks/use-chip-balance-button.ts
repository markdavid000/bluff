"use client";

import { useState } from "react";
import { useChipBalance } from "@/hooks/use-chip-balance";
import { chipsCopy } from "../copy";
import { useClaimChips } from "./use-claim-chips";
import { usePendingCashOut } from "./use-pending-cash-out";

export function useChipBalanceButton() {
  const [open, setOpen] = useState(false);
  const balance = useChipBalance({ working: chipsCopy.showingChips, automaticPermit: true });
  const claim = useClaimChips();
  const pending = usePendingCashOut();
  return {
    balance,
    open,
    setOpen,
    needsYou: claim.status === "ready" || Boolean(pending.data),
  };
}
