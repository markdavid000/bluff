import { cn } from "cn";
import { tableCopy } from "../copy";

export function ComputerTag({ small = false }: { small?: boolean }) {
  return (
    <span
      className={cn(
        "rounded-full border-2 border-seat-blue-edge bg-seat-blue font-game leading-none text-seat-foreground",
        small ? "px-1.5 py-px text-[0.6rem]" : "px-2 py-0.5 text-xs"
      )}
    >
      {tableCopy.computer}
    </span>
  );
}
