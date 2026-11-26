import { cn } from "cn";
import { formatCountdown } from "@/lib/time";
import { tableCopy } from "../copy";
import { BADGE_LABEL, URGENT_BADGE, WOODEN_BADGE } from "./badge-styles";

const URGENT_MS = 60_000;

export function GameClock({ leftMs }: { leftMs: number }) {
  const clock = formatCountdown(leftMs).replace(/^00:/, "");
  const urgent = leftMs <= URGENT_MS;
  return (
    <span
      role="timer"
      aria-label={`${tableCopy.gameEndsIn} ${clock}`}
      data-urgent={urgent}
      className={cn(
        urgent ? URGENT_BADGE : WOODEN_BADGE,
        "flex-col justify-center px-3.5 leading-none max-[40rem]:px-2.5",
        urgent && "animate-pulse calm:animate-none"
      )}
    >
      <span aria-hidden className={BADGE_LABEL}>
        {tableCopy.timeLabel}
      </span>
      <span aria-hidden className="font-heading text-xl tabular-nums">
        {clock}
      </span>
    </span>
  );
}
