"use client";

import { cn } from "cn";
import { Appear } from "@/components/shared/appear";
import { WOODEN_BADGE } from "./badge-styles";

export function TurnBanner({ line, quiet }: { line: string | null; quiet: boolean }) {
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center", !quiet && "min-h-12")}
    >
      {line && quiet ? <span className="sr-only">{line}</span> : null}
      <Appear show={line !== null && !quiet} swapKey={line ?? ""} inline pop>
        <span className={cn(WOODEN_BADGE, "h-11 rounded-full px-5 text-center font-game text-lg")}>
          {line}
        </span>
      </Appear>
    </div>
  );
}
