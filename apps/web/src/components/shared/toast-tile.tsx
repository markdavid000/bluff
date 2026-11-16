"use client";

import { cva } from "class-variance-authority";
import { cn } from "cn";
import { motion } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import type { ReactNode } from "react";
import { GameIcon, type GameIconName } from "./game-icon";
import { PatternBand } from "./pattern-band";

export type ToastKind = "loading" | "success" | "info" | "error";

const toneOf = cva("flex h-full w-2 shrink-0 rounded-l-xl", {
  variants: {
    kind: {
      loading: "bg-accent",
      success: "bg-success",
      info: "bg-seat-blue",
      error: "bg-destructive",
    },
  },
});

export function ToastTile({
  kind,
  title,
  icon,
  action,
}: {
  kind: ToastKind;
  title: ReactNode;
  icon?: GameIconName;
  action?: ReactNode;
}) {
  const calm = useCalmMotion();
  return (
    <motion.div
      role={kind === "error" ? "alert" : "status"}
      layout
      initial={calm ? { opacity: 0 } : { opacity: 0, y: -40, rotateX: 40, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, rotateX: 0, scale: 1 }}
      exit={calm ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.95 }}
      transition={calm ? { duration: 0.15 } : { type: "spring", stiffness: 420, damping: 26 }}
      className={cn(
        "flex w-full max-w-sm overflow-hidden rounded-xl border-2 border-toast-edge bg-toast text-toast-foreground",
        "shadow-[0_5px_0_0_var(--color-toast-edge),0_16px_24px_-10px_rgb(0_0_0/0.55)]"
      )}
    >
      <span aria-hidden className={toneOf({ kind })} />
      <div className="flex flex-1 flex-col gap-2 p-3">
        <PatternBand className="h-2 w-full opacity-70" />
        <div className="flex items-center justify-between gap-3">
          {icon && <GameIcon name={icon} size={30} />}
          <p className="flex-1 font-game text-base">{title}</p>
          {action}
        </div>
      </div>
    </motion.div>
  );
}
