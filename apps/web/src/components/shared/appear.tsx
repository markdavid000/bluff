"use client";

import { AnimatePresence, motion, useIsPresent } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import type { ReactNode } from "react";

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

const LEAVING = { duration: 0.18, ease: EASE_OUT };

const MOVING = {
  initial: { opacity: 0, y: 10, scale: 0.97 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: 6, scale: 0.98 },
  transition: { duration: 0.32, ease: EASE_OUT },
};

const POPPING = {
  initial: { opacity: 0, y: 8, scale: 0.6 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: MOVING.exit,
  transition: { type: "spring" as const, stiffness: 420, damping: 18 },
};

const CALM = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  exit: { opacity: 0 },
  transition: { duration: 0.18 },
};

function Shell({
  children,
  className,
  inline,
  pop,
}: {
  children: ReactNode;
  className?: string;
  inline: boolean;
  pop: boolean;
}) {
  const present = useIsPresent();
  const motionSet = useCalmMotion() ? CALM : pop ? POPPING : MOVING;
  const Element = inline ? motion.span : motion.div;
  return (
    <Element
      inert={!present}
      className={className}
      initial={motionSet.initial}
      animate={motionSet.animate}
      exit={motionSet.exit}
      transition={present ? motionSet.transition : LEAVING}
    >
      {children}
    </Element>
  );
}

export function Appear({
  show,
  children,
  className,
  inline = false,
  pop = false,
  swapKey,
  onMount = false,
}: {
  show: boolean;
  children: ReactNode;
  className?: string;
  inline?: boolean;
  pop?: boolean;
  swapKey?: string;
  onMount?: boolean;
}) {
  return (
    <AnimatePresence initial={onMount} mode={swapKey === undefined ? "sync" : "wait"}>
      {show ? (
        <Shell key={swapKey ?? "appear"} className={className} inline={inline} pop={pop}>
          {children}
        </Shell>
      ) : null}
    </AnimatePresence>
  );
}
