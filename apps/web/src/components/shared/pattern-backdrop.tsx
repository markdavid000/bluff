import { cn } from "cn";

const BACKDROP_PATTERN_ID = "bluff-pattern-backdrop";

export function PatternBackdrop({ className }: { className?: string }) {
  const id = BACKDROP_PATTERN_ID;
  return (
    <svg aria-hidden className={cn("pointer-events-none absolute inset-0 size-full", className)}>
      <defs>
        <pattern id={id} width="96" height="96" patternUnits="userSpaceOnUse">
          <circle cx="24" cy="24" r="11" fill="none" stroke="currentColor" strokeWidth="2.5" />
          <circle cx="24" cy="24" r="3.5" fill="currentColor" />
          <path
            d="M60 8 L60 40 M70 8 L70 40 M60 16 L70 16 M60 24 L70 24 M60 32 L70 32"
            stroke="currentColor"
            strokeWidth="2"
          />
          <path
            d="M24 60 C24 52 30 49 33 46 C33 54 30 59 24 60 C30 61 33 66 33 74 C30 71 24 68 24 60 Z"
            fill="currentColor"
          />
          <path d="M60 60 L80 60 L70 78 Z" fill="none" stroke="currentColor" strokeWidth="2" />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}
