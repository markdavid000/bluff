"use client";

import { cn } from "cn";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import type { ReactNode } from "react";

const MAX_TILT_DEGREES = 6;

export function RaisedCard({ children, className }: { children: ReactNode; className?: string }) {
  const calm = useCalmMotion();
  const pointerX = useMotionValue(0.5);
  const pointerY = useMotionValue(0.5);
  const springX = useSpring(pointerX, { stiffness: 220, damping: 18 });
  const springY = useSpring(pointerY, { stiffness: 220, damping: 18 });
  const rotateY = useTransform(springX, [0, 1], [-MAX_TILT_DEGREES, MAX_TILT_DEGREES]);
  const rotateX = useTransform(springY, [0, 1], [MAX_TILT_DEGREES, -MAX_TILT_DEGREES]);

  return (
    <div className="[perspective:900px]">
      <motion.div
        className={cn(
          "relative rounded-2xl border-2 border-tile-edge/40 bg-card p-6 text-card-foreground",
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.18),0_6px_0_0_var(--color-tile-edge),0_18px_30px_-12px_rgb(0_0_0/0.4)]",
          className
        )}
        style={calm ? undefined : { rotateX, rotateY }}
        whileHover={calm ? undefined : { y: -4 }}
        whileTap={calm ? undefined : { y: -2, scale: 0.99 }}
        onPointerMove={(event) => {
          if (event.pointerType !== "mouse") return;
          const box = event.currentTarget.getBoundingClientRect();
          pointerX.set((event.clientX - box.left) / box.width);
          pointerY.set((event.clientY - box.top) / box.height);
        }}
        onPointerLeave={() => {
          pointerX.set(0.5);
          pointerY.set(0.5);
        }}
      >
        {children}
      </motion.div>
    </div>
  );
}
