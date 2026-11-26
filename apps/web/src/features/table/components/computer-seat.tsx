import { cn } from "cn";
import { tableCopy } from "../copy";
import { ComputerTag } from "./computer-tag";

export function ComputerSeat({ compact = false }: { compact?: boolean }) {
  return (
    <figure aria-label={tableCopy.computerJoining} className="flex flex-col items-center gap-1.5">
      <span
        aria-hidden
        className={cn(
          "block animate-pulse rounded-full border-2 border-dashed border-seat-blue-edge bg-muted calm:animate-none",
          compact ? "size-11" : "size-16"
        )}
      />
      <figcaption aria-hidden className="flex flex-col items-center gap-1 leading-tight">
        <ComputerTag small={compact} />
        <span className={cn("text-muted-foreground", compact ? "text-[0.65rem]" : "text-xs")}>
          {tableCopy.computerSeatJoining}
        </span>
      </figcaption>
    </figure>
  );
}
