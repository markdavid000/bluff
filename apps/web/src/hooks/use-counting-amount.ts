"use client";

import { animate } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import { useEffect, useRef, useState } from "react";
import { ONE_CHIP } from "@/lib/chips";

const COUNT_SECONDS = 0.9;
const UNITS = Number(ONE_CHIP);

export function useCountingAmount(target: bigint) {
  const calm = useCalmMotion();
  const [shown, setShown] = useState(target);
  const displayed = useRef(target);

  useEffect(() => {
    const start = displayed.current;
    if (start === target) return;
    const controls = animate(Number(start) / UNITS, Number(target) / UNITS, {
      duration: calm ? 0 : COUNT_SECONDS,
      ease: "easeOut",
      onUpdate: (chips) => {
        displayed.current = BigInt(Math.round(chips * UNITS));
        setShown(displayed.current);
      },
      onComplete: () => {
        displayed.current = target;
        setShown(target);
      },
    });
    return () => controls.stop();
  }, [target, calm]);

  const direction = shown < target ? "up" : shown > target ? "down" : null;
  return { shown, direction } as const;
}
