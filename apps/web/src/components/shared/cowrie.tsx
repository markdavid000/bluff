import { cn } from "cn";
import { useId } from "react";

const TEETH = [-15, -9, -3, 3, 9, 15];

export function Cowrie({ size = 28, className }: { size?: number; className?: string }) {
  const id = useId();
  const body = `${id}-body`;
  const gloss = `${id}-gloss`;
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      aria-hidden
      className={cn("shrink-0 drop-shadow-[0_2px_1px_rgb(0_0_0/0.3)]", className)}
    >
      <defs>
        <radialGradient id={body} cx="38%" cy="30%" r="75%">
          <stop offset="0%" stopColor="var(--cowrie)" />
          <stop offset="60%" stopColor="var(--cowrie)" />
          <stop offset="100%" stopColor="var(--cowrie-shade)" />
        </radialGradient>
        <linearGradient id={gloss} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="white" stopOpacity="0.9" />
          <stop offset="100%" stopColor="white" stopOpacity="0" />
        </linearGradient>
      </defs>
      <g transform="rotate(-24 32 32)">
        <ellipse cx="32" cy="35" rx="18" ry="25" fill="var(--cowrie-shade)" />
        <ellipse cx="32" cy="32" rx="18" ry="25" fill={`url(#${body})`} />
        <path
          d="M32 11 C29 20 35 26 32 32 C29 38 35 44 32 53"
          fill="none"
          stroke="var(--cowrie-slit)"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        {TEETH.map((offset) => (
          <g key={offset} stroke="var(--cowrie-slit)" strokeWidth="1.8" strokeLinecap="round">
            <line x1={27} y1={32 + offset} x2={30} y2={32 + offset} />
            <line x1={34} y1={32 + offset} x2={37} y2={32 + offset} />
          </g>
        ))}
        <ellipse cx="25" cy="20" rx="5" ry="8" fill={`url(#${gloss})`} />
      </g>
    </svg>
  );
}
