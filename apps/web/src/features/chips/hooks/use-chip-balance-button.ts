"use client";

import { useState } from "react";
import { useChipBalance } from "@/hooks/use-chip-balance";
import { chipsCopy } from "../copy";
import { useChipsPanel } from "./use-chips-panel";

export function useChipBalanceButton() {
  const [open, setOpen] = useState(false);
  const balance = useChipBalance({ working: chipsCopy.showingChips, automaticPermit: true });
  const panel = useChipsPanel();
  const { claim, cashOut } = panel;
  const claiming = claim.status === "ready" && claim.working;
  const workingLabel = claiming
    ? claim.confirmInWallet
      ? chipsCopy.confirmInWallet
      : chipsCopy.claimWorking
    : chipsCopy.cashOutWorking;
  return {
    balance,
    panel,
    open,
    setOpen,
    busy: claiming || cashOut.working,
    workingLabel,
    needsYou: claim.status === "ready" || panel.resume !== null,
  };
}
