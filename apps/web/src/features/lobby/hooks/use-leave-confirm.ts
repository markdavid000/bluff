"use client";

import { useState } from "react";

export function useLeaveConfirm({ needed, leave }: { needed: boolean; leave: () => void }) {
  const [asking, setAsking] = useState(false);
  return {
    asking,
    setAsking,
    request: () => (needed ? setAsking(true) : leave()),
    confirm: () => {
      setAsking(false);
      leave();
    },
  };
}
