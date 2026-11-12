"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import type { ReactNode } from "react";
import { formatCountdown } from "@/lib/time";

export function CountdownBadge({
  label,
  remainingMs,
  icon,
  className,
}: {
  label: string;
  remainingMs: number;
  icon?: ReactNode;
  className?: string;
}) {
  const calm = useReducedMotion();
  const time = formatCountdown(remainingMs);
  const tick = Math.ceil(remainingMs / 1000);

  return (
    <span
      role="timer"
      aria-label={`${label} ${time}`}
      className={cn(
        "relative inline-flex items-center gap-2 rounded-full border-2 border-seat-yellow-edge bg-seat-yellow py-1.5 pr-4 pl-2 text-seat-yellow-foreground",
        "shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_4px_0_0_var(--color-seat-yellow-edge),0_8px_14px_-6px_rgb(0_0_0/0.4)]",
        className
      )}
    >
      {calm ? null : (
        <motion.span
          key={tick}
          aria-hidden
          className="pointer-events-none absolute inset-0 rounded-full border-2 border-seat-yellow"
          initial={{ opacity: 0.7, scale: 1 }}
          animate={{ opacity: 0, scale: 1.18 }}
          transition={{ duration: 0.9, ease: "easeOut" }}
        />
      )}
      {icon}
      <span aria-hidden className="flex flex-col leading-none">
        <span className="text-[0.65rem] font-bold tracking-wider uppercase opacity-80">
          {label}
        </span>
        <motion.span
          key={calm ? "still" : tick}
          className="font-game text-xl tabular-nums"
          initial={calm ? false : { scale: 1.08 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.25, ease: "easeOut" }}
        >
          {time}
        </motion.span>
      </span>
    </span>
  );
}
