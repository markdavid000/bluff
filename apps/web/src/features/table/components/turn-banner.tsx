"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import { WOODEN_BADGE } from "./badge-styles";

export function TurnBanner({ line, quiet }: { line: string | null; quiet: boolean }) {
  const calm = useReducedMotion();
  return (
    <div
      role="status"
      aria-live="polite"
      className={cn("flex items-center justify-center", !quiet && "min-h-12")}
    >
      {line && quiet ? <span className="sr-only">{line}</span> : null}
      {line && !quiet ? (
        <motion.span
          key={line}
          initial={calm ? false : { scale: 0.6, opacity: 0, y: 6 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          transition={{ type: "spring", stiffness: 380, damping: 18 }}
          className={cn(WOODEN_BADGE, "h-11 rounded-full px-5 text-center font-game text-lg")}
        >
          {line}
        </motion.span>
      ) : null}
    </div>
  );
}
