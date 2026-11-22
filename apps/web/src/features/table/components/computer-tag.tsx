import { tableCopy } from "../copy";

export function ComputerTag() {
  return (
    <span className="rounded-full border-2 border-seat-blue-edge bg-seat-blue px-2 py-0.5 font-game text-xs leading-none text-seat-foreground">
      {tableCopy.computer}
    </span>
  );
}
