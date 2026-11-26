"use client";

import { useState } from "react";

export function useConfirm(act: () => void) {
  const [asking, setAsking] = useState(false);
  return {
    asking,
    setAsking,
    ask: () => setAsking(true),
    confirm: () => {
      setAsking(false);
      act();
    },
  };
}
