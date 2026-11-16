"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";
import { Cowrie } from "@/components/shared/cowrie";
import { useCalmMotion } from "@/hooks/use-calm-motion";

const POUR = [
  { x: -46, turn: -40 },
  { x: 38, turn: 30 },
  { x: -18, turn: 60 },
  { x: 58, turn: -70 },
  { x: -64, turn: 20 },
  { x: 8, turn: -25 },
  { x: 28, turn: 80 },
  { x: -32, turn: -60 },
];

export function CowriePour({ children }: { children: ReactNode }) {
  const calm = useCalmMotion();
  return (
    <div className="relative">
      {calm
        ? null
        : POUR.map((cowrie, index) => (
            <motion.span
              key={index}
              aria-hidden
              data-pouring-cowrie
              initial={{ x: cowrie.x * 0.4, y: -110, rotate: 0, opacity: 0 }}
              animate={{
                x: cowrie.x,
                y: [-110, 10, 2, 6],
                rotate: cowrie.turn,
                opacity: [0, 1, 1, 0],
              }}
              transition={{ duration: 1.4, delay: 0.25 + index * 0.08, ease: "easeOut" }}
              className="pointer-events-none absolute top-1/2 left-1/2 -ml-3"
            >
              <Cowrie size={24} />
            </motion.span>
          ))}
      {children}
    </div>
  );
}
