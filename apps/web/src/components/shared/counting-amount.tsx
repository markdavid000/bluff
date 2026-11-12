"use client";

import { cn } from "cn";
import { useCountingAmount } from "@/hooks/use-counting-amount";
import { formatChips } from "@/lib/chips";

export function CountingAmount({
  amount,
  format = formatChips,
  className,
}: {
  amount: bigint;
  format?: (amount: bigint) => string;
  className?: string;
}) {
  const { shown, direction } = useCountingAmount(amount);
  return (
    <>
      <span
        aria-hidden
        className={cn(
          "inline-block tabular-nums transition-[color,scale] duration-200",
          direction === "up" && "scale-110 text-seat-green",
          direction === "down" && "scale-110 text-destructive",
          className
        )}
      >
        {format(shown)}
      </span>
      <span className="sr-only">{format(amount)}</span>
    </>
  );
}
