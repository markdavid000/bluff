import type { ReactNode } from "react";

const RING_START_HUE = 130;
const RADIUS = 46;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function TurnRing({
  active,
  fraction,
  children,
}: {
  active: boolean;
  fraction: number;
  children: ReactNode;
}) {
  const left = Math.min(Math.max(fraction, 0), 1);
  const hue = Math.round(RING_START_HUE * left);
  return (
    <span className="relative block rounded-full p-1.5">
      {active ? (
        <svg aria-hidden viewBox="0 0 100 100" className="absolute inset-0 size-full -rotate-90">
          <circle
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="7"
            className="stroke-muted/70"
          />
          <circle
            data-turn-ring
            cx="50"
            cy="50"
            r={RADIUS}
            fill="none"
            strokeWidth="7"
            strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={CIRCUMFERENCE * (1 - left)}
            stroke={`hsl(${hue} 80% 45%)`}
            className="transition-[stroke-dashoffset,stroke] duration-1000 ease-linear motion-reduce:transition-none"
          />
        </svg>
      ) : null}
      <span className="relative block rounded-full bg-background p-0.5">{children}</span>
    </span>
  );
}
