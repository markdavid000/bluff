"use client";

import { useState } from "react";

export function useLeaveConfirm(leave: () => void) {
  const [asking, setAsking] = useState(false);
  return {
    asking,
    setAsking,
    ask: () => setAsking(true),
    confirm: () => {
      setAsking(false);
      leave();
    },
  };
}
