import { cn } from "cn";
import { tableCopy } from "../copy";
import { BADGE_LABEL, WOODEN_BADGE } from "./badge-styles";
import { HiddenDie } from "./hidden-die";

export function RoundBadge({ round, diceInPlay }: { round: number; diceInPlay: number }) {
  return (
    <span
      role="group"
      aria-label={tableCopy.roundLine(round, diceInPlay)}
      className={cn(WOODEN_BADGE, "gap-3 px-4")}
    >
      <span aria-hidden className="flex flex-col items-center leading-none">
        <span className={BADGE_LABEL}>{tableCopy.roundLabel}</span>
        <span className="font-heading text-2xl">{round}</span>
      </span>
      <span aria-hidden className="h-7 w-0.5 rounded-full bg-cowrie/25" />
      <span aria-hidden className="flex items-center gap-1.5 font-game text-lg leading-none">
        <HiddenDie className="size-5 text-[0.55rem]" />
        {diceInPlay}
        <span className="hidden text-xs opacity-80 sm:inline">{tableCopy.diceInPlayWord}</span>
      </span>
    </span>
  );
}
