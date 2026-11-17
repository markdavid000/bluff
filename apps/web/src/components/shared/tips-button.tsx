"use client";

import { showTips } from "@/hooks/use-tips-request";
import { ActionButton } from "./action-button";
import { sharedCopy } from "./copy";

export function TipsButton() {
  return (
    <ActionButton
      tone="quiet"
      size="small"
      icon="target"
      aria-label={sharedCopy.gameTips}
      onClick={showTips}
    >
      <span className="hidden sm:inline">{sharedCopy.tips}</span>
    </ActionButton>
  );
}
