"use client";

import { useBoardSetting } from "@/hooks/use-board-setting";

export function useBoardChoice(): boolean {
  return useBoardSetting().board === "flat";
}
