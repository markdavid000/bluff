import { cn } from "cn";
import { tableCopy } from "../copy";

export function HiddenDie({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex aspect-square items-center justify-center rounded-[22%] bg-tile font-game text-tile-foreground shadow-[inset_0_-2px_0_0_rgb(0_0_0/0.15),0_2px_0_0_var(--color-tile-edge)]",
        className
      )}
    >
      {tableCopy.hiddenMark}
    </span>
  );
}
