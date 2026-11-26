"use client";

import type { VariantProps } from "class-variance-authority";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import type { ComponentProps, ReactNode } from "react";
import { Button } from "@/components/ui/button";
import type { SoundName } from "@/config/sounds";
import { useSound } from "@/hooks/use-sound";
import { Cowrie } from "./cowrie";
import { GameIcon, type GameIconName } from "./game-icon";
import { SpinningDie } from "./spinning-die";
import { tileVariants } from "./tile-variants";

type ActionButtonProps = Omit<ComponentProps<"button">, "children"> &
  VariantProps<typeof tileVariants> & {
    children: ReactNode;
    working?: boolean;
    workingLabel?: ReactNode;
    icon?: GameIconName | "cowrie";
    sound?: SoundName;
  };

export function ActionButton({
  tone,
  size,
  className,
  children,
  working = false,
  workingLabel,
  icon,
  sound = "tap",
  onPointerDown,
  ...props
}: ActionButtonProps) {
  const { play } = useSound();
  const calm = useCalmMotion();
  const showWorking = working && workingLabel !== undefined;
  const iconSize = size === "large" ? 34 : size === "small" ? 22 : 28;
  return (
    <Button
      {...props}
      aria-busy={working || undefined}
      className={cn(tileVariants({ tone, size }), className)}
      onPointerDown={(event) => {
        play(sound);
        onPointerDown?.(event);
      }}
    >
      <span className="relative inline-grid overflow-hidden">
        <AnimatePresence mode="popLayout" initial={false}>
          <motion.span
            key={showWorking ? "working" : "ready"}
            className="inline-flex items-center justify-center gap-2"
            initial={calm ? { opacity: 0 } : { opacity: 0, y: "70%", filter: "blur(2px)" }}
            animate={{ opacity: 1, y: "0%", filter: "blur(0px)" }}
            exit={calm ? { opacity: 0 } : { opacity: 0, y: "-70%", filter: "blur(2px)" }}
            transition={calm ? { duration: 0.12 } : { type: "spring", stiffness: 520, damping: 34 }}
          >
            {showWorking ? (
              <>
                <SpinningDie className={size === "large" ? "size-6" : "size-5"} />
                {workingLabel}
              </>
            ) : (
              <>
                {icon === "cowrie" ? (
                  <Cowrie size={iconSize} />
                ) : icon ? (
                  <GameIcon name={icon} size={iconSize} className="max-[40rem]:size-[0.8lh]" />
                ) : null}
                {children}
              </>
            )}
          </motion.span>
        </AnimatePresence>
      </span>
    </Button>
  );
}
