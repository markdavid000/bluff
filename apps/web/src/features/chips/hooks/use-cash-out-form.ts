"use client";

import { useState } from "react";
import { formatChips, parseChips } from "@/lib/chips";
import { notify } from "@/lib/notify";
import { chipsCopy } from "../copy";

export function useCashOutForm(balance: bigint) {
  const [text, setText] = useState("");
  const [invalid, setInvalid] = useState(false);

  function whatToFix(amount: bigint | null): string | null {
    if (text.trim() === "") return chipsCopy.cashOutEmpty;
    if (amount === null) return chipsCopy.cashOutInvalid;
    return amount > balance ? chipsCopy.cashOutTooMany(formatChips(balance)) : null;
  }

  return {
    text,
    invalid,
    change: (value: string) => {
      setInvalid(false);
      setText(value);
    },
    submit: (cashOut: (amount: bigint) => void) => {
      const amount = parseChips(text);
      const fix = whatToFix(amount);
      if (fix !== null || amount === null) {
        setInvalid(true);
        notify.error(fix ?? chipsCopy.cashOutInvalid, { id: "cash-out-amount" });
        return;
      }
      cashOut(amount);
    },
    reset: () => {
      setText("");
      setInvalid(false);
    },
  };
}
