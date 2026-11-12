import { cn } from "cn";

const BAND_PATTERN_ID = "bluff-pattern-band";

export function PatternBand({ className }: { className?: string }) {
  const id = BAND_PATTERN_ID;
  return (
    <svg aria-hidden className={cn("text-pattern", className)} preserveAspectRatio="none">
      <defs>
        <pattern id={id} width="48" height="24" patternUnits="userSpaceOnUse">
          <rect width="48" height="24" fill="currentColor" />
          <circle
            cx="12"
            cy="12"
            r="7"
            fill="none"
            stroke="var(--color-pattern-accent)"
            strokeWidth="2"
          />
          <circle cx="12" cy="12" r="2.2" fill="var(--color-pattern-accent)" />
          <path
            d="M28 4 L28 20 M33 4 L33 20 M28 8 L33 8 M28 12 L33 12 M28 16 L33 16"
            stroke="var(--color-pattern-accent)"
            strokeWidth="1.6"
          />
          <path
            d="M40 12 C40 7 44 5 46 3 C46 8 44 11 40 12 C44 13 46 16 46 21 C44 19 40 17 40 12 Z"
            fill="var(--color-pattern-accent)"
          />
        </pattern>
      </defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  );
}

export function PatternFrame({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("overflow-hidden rounded-2xl border-4 border-pattern bg-card", className)}>
      <PatternBand className="h-4 w-full" />
      <div className="p-5">{children}</div>
      <PatternBand className="h-4 w-full" />
    </div>
  );
}
