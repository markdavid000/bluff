"use client";

import { motion, useReducedMotion } from "motion/react";

const SLEEP = [
  { x: 206, y: 66, scale: 0.7, delay: 0 },
  { x: 222, y: 48, scale: 0.9, delay: 0.6 },
  { x: 242, y: 26, scale: 1.1, delay: 1.2 },
];

function Stool({ x, y, colour, edge }: { x: number; y: number; colour: string; edge: string }) {
  return (
    <g>
      <rect x={x - 16} y={y} width={32} height={26} rx={4} fill={`var(${edge})`} />
      <ellipse cx={x} cy={y + 26} rx={16} ry={5} fill={`var(${edge})`} />
      <ellipse cx={x} cy={y} rx={16} ry={5} fill={`var(${colour})`} />
    </g>
  );
}

function Die({ x, y, pips }: { x: number; y: number; pips: [number, number][] }) {
  return (
    <g transform={`translate(${x} ${y}) rotate(-12)`}>
      <rect width={20} height={20} rx={4} fill="var(--cowrie-shade)" y={3} />
      <rect width={20} height={20} rx={4} fill="var(--cowrie)" />
      {pips.map(([px, py]) => (
        <circle key={`${px}-${py}`} cx={px} cy={py} r={2.2} fill="var(--cowrie-slit)" />
      ))}
    </g>
  );
}

export function EmptyTablesArt({ className }: { className?: string }) {
  const calm = useReducedMotion();
  return (
    <svg viewBox="0 0 320 210" aria-hidden className={className}>
      <ellipse cx={160} cy={196} rx={140} ry={10} fill="var(--board-edge)" opacity={0.25} />
      <Stool x={70} y={84} colour="--seat-blue" edge="--seat-blue-edge" />
      <Stool x={250} y={84} colour="--seat-green" edge="--seat-green-edge" />
      <rect x={100} y={128} width={14} height={60} rx={3} fill="var(--board-edge)" />
      <rect x={206} y={128} width={14} height={60} rx={3} fill="var(--board-edge)" />
      <ellipse cx={160} cy={124} rx={118} ry={34} fill="var(--board-edge)" />
      <ellipse cx={160} cy={116} rx={118} ry={34} fill="var(--board)" />
      <ellipse
        cx={160}
        cy={116}
        rx={96}
        ry={24}
        fill="none"
        stroke="var(--pattern-accent)"
        strokeWidth={2}
        strokeDasharray="6 6"
        opacity={0.6}
      />
      <path
        d="M168 112 C168 84 214 84 214 112 Z"
        fill="var(--pattern-accent)"
        stroke="var(--board-edge)"
        strokeWidth={2}
      />
      <path
        d="M176 104 C184 96 198 96 206 104"
        fill="none"
        stroke="var(--board-edge)"
        strokeWidth={1.5}
        opacity={0.5}
      />
      <Die
        x={118}
        y={104}
        pips={[
          [5, 5],
          [10, 10],
          [15, 15],
        ]}
      />
      <Die
        x={142}
        y={118}
        pips={[
          [6, 6],
          [14, 14],
        ]}
      />
      <Stool x={110} y={160} colour="--seat-red" edge="--seat-red-edge" />
      <Stool x={214} y={160} colour="--seat-yellow" edge="--seat-yellow-edge" />
      <g stroke="var(--muted-foreground)" strokeWidth={1} fill="none" opacity={0.55}>
        <path d="M290 0 L250 40 M290 0 L262 48 M290 0 L280 52" />
        <path d="M262 14 Q272 18 284 12 M256 26 Q270 32 286 24 M252 38 Q268 44 288 38" />
      </g>
      {SLEEP.map(({ x, y, scale, delay }) => (
        <motion.path
          key={x}
          d="M0 0 h10 l-10 12 h10"
          fill="none"
          stroke="var(--foreground)"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          transform={`translate(${x} ${y}) scale(${scale})`}
          initial={calm ? false : { opacity: 0 }}
          animate={calm ? { opacity: 0.7 } : { opacity: [0, 0.8, 0], y: [0, -8, -16] }}
          transition={
            calm ? undefined : { duration: 2.4, repeat: Infinity, delay, ease: "easeOut" }
          }
        />
      ))}
    </svg>
  );
}
