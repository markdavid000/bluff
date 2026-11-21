import { tableCopy } from "../copy";
import { ComputerTag } from "./computer-tag";

export function ComputerSeat() {
  return (
    <figure aria-label={tableCopy.computerJoining} className="flex flex-col items-center gap-1.5">
      <span
        aria-hidden
        className="block size-16 animate-pulse rounded-full border-2 border-dashed border-seat-blue-edge bg-muted calm:animate-none"
      />
      <figcaption aria-hidden className="flex flex-col items-center gap-1 leading-tight">
        <ComputerTag />
        <span className="text-xs text-muted-foreground">{tableCopy.computerSeatJoining}</span>
      </figcaption>
    </figure>
  );
}
