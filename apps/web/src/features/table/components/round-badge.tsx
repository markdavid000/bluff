import { cn } from "cn";
import { tableCopy } from "../copy";
import { BADGE_LABEL, WOODEN_BADGE } from "./badge-styles";
import { HiddenDie } from "./hidden-die";

export function RoundBadge({
  round,
  diceInPlay,
  onOpen,
}: {
  round: number;
  diceInPlay: number;
  onOpen?: () => void;
}) {
  const inside = <BadgeInside round={round} diceInPlay={diceInPlay} />;
  if (onOpen) {
    return (
      <button
        type="button"
        aria-label={tableCopy.openHistory(round, diceInPlay)}
        onClick={onOpen}
        className={cn(
          WOODEN_BADGE,
          "gap-3 px-4 focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none max-[40rem]:gap-2 max-[40rem]:px-2.5"
        )}
      >
        {inside}
      </button>
    );
  }
  return (
    <span
      role="group"
      aria-label={tableCopy.roundLine(round, diceInPlay)}
      className={cn(WOODEN_BADGE, "gap-3 px-4 max-[40rem]:gap-2 max-[40rem]:px-2.5")}
    >
      {inside}
    </span>
  );
}

function BadgeInside({ round, diceInPlay }: { round: number; diceInPlay: number }) {
  return (
    <>
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
    </>
  );
}
