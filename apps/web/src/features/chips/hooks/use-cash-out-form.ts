"use client";

import { useState } from "react";
import { formatChips, parseChips } from "@/lib/chips";
import { chipsCopy } from "../copy";

export function useCashOutForm(balance: bigint) {
  const [text, setText] = useState("");
  const [touched, setTouched] = useState(false);
  const amount = parseChips(text);
  const problem =
    amount === null
      ? chipsCopy.cashOutInvalid
      : amount > balance
        ? chipsCopy.cashOutTooMany(formatChips(balance))
        : null;

  return {
    text,
    error: touched ? problem : null,
    change: (value: string) => {
      setTouched(true);
      setText(value);
    },
    submit: (cashOut: (amount: bigint) => void) => {
      setTouched(true);
      if (amount !== null && problem === null) cashOut(amount);
    },
    reset: () => {
      setText("");
      setTouched(false);
    },
  };
}
