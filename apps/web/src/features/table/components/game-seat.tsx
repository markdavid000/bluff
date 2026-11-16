"use client";

import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import { useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { Avatar } from "@/components/shared/avatar";
import { DieFace } from "@/components/shared/die";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import type { Bid } from "@/lib/bid-rules";
import type { Face } from "@/lib/dice-physics";
import { tableCopy } from "../copy";
import type { OwnDice } from "../hooks/use-own-dice";
import { HiddenDie } from "./hidden-die";
import { TurnRing } from "./turn-ring";

function word(face: number) {
  return tableCopy.faceWords[face - 1] ?? String(face);
}

export function GameSeat({
  name,
  avatarSrc,
  isMe,
  dice,
  isActive,
  isTurn,
  turnFraction,
  lastBid,
  ownDice,
  matching,
  holdDice,
}: {
  name: string;
  avatarSrc: string | undefined;
  isMe: boolean;
  dice: number;
  isActive: boolean;
  isTurn: boolean;
  turnFraction: number;
  lastBid: Bid | null;
  ownDice: OwnDice | null;
  matching: readonly boolean[] | null;
  holdDice: boolean;
}) {
  const [diceShown, setDiceShown] = useState(dice);
  const [lost, setLost] = useState(0);
  if (!holdDice && diceShown !== dice) {
    if (dice < diceShown) setLost((count) => count + 1);
    setDiceShown(dice);
  }
  const shown = isMe ? tableCopy.you : name;
  const state = !isActive ? tableCopy.out : tableCopy.diceLeft(diceShown);
  return (
    <figure
      aria-label={[shown, state, isTurn ? tableCopy.thinking : null].filter(Boolean).join(", ")}
      className={cn("flex flex-col items-center gap-1", !isActive && "opacity-50 grayscale")}
    >
      <span className="relative">
        <Appear
          show={isMe && isTurn}
          inline
          pop
          className="absolute bottom-full left-1/2 z-10 mb-1 -translate-x-1/2"
        >
          <span className="block rounded-full border-2 border-seat-yellow-edge bg-seat-yellow px-3 py-1 font-game text-sm leading-none whitespace-nowrap text-seat-yellow-foreground shadow-[0_3px_0_0_var(--color-seat-yellow-edge)]">
            {tableCopy.yourTurnTag}
          </span>
        </Appear>
        <TurnRing active={isTurn} fraction={turnFraction}>
          {avatarSrc ? (
            <Avatar src={avatarSrc} size={52} className={cn(isMe && "ring-2 ring-seat-yellow")} />
          ) : (
            <span
              aria-hidden
              className="block size-13 animate-pulse rounded-full bg-muted calm:animate-none"
            />
          )}
        </TurnRing>
        <Appear
          show={lastBid !== null}
          swapKey={lastBid ? `${lastBid.quantity}-${lastBid.face}` : ""}
          inline
          className="absolute top-1/2 left-full z-10 ml-1.5 -translate-y-1/2"
        >
          {lastBid ? (
            <span
              aria-label={tableCopy.lastBidOf(
                shown,
                tableCopy.bid(lastBid.quantity, word(lastBid.face))
              )}
              className="flex items-center gap-1.5 rounded-full border-2 border-seat-yellow-edge bg-seat-yellow py-1 pr-1.5 pl-2.5 font-game text-lg leading-none whitespace-nowrap text-seat-yellow-foreground shadow-[0_3px_0_0_var(--color-seat-yellow-edge)]"
            >
              {tableCopy.timesMark(lastBid.quantity)}
              <DieFace face={lastBid.face} className="size-7" />
            </span>
          ) : null}
        </Appear>
      </span>
      <figcaption className="max-w-28 truncate font-game text-sm leading-tight">
        {shown || (
          <span
            data-name-loading
            className="inline-block h-[1em] w-16 animate-pulse rounded bg-muted align-middle calm:animate-none"
          />
        )}
      </figcaption>
      <span className="relative">
        {isActive ? <SeatDice dice={diceShown} ownDice={ownDice} matching={matching} /> : null}
        <AnimatePresence>
          {lost > 0 ? <LostDie key={lost} onDone={() => setLost(0)} /> : null}
        </AnimatePresence>
      </span>
    </figure>
  );
}

function LostDie({ onDone }: { onDone: () => void }) {
  const calm = useCalmMotion();
  return (
    <motion.span
      aria-hidden
      data-lost-die
      initial={{ opacity: 1, scale: 1.4, x: 0, y: 0, rotate: 0 }}
      animate={
        calm
          ? { opacity: [1, 1, 0], scale: [1.4, 1.2, 0.6] }
          : { x: [0, 60, 150], y: [0, -40, 70], rotate: [0, 200, 520], opacity: [1, 1, 0] }
      }
      transition={calm ? { duration: 1.1 } : { duration: 1.2, ease: "easeIn" }}
      onAnimationComplete={onDone}
      className="pointer-events-none absolute top-1/2 left-1/2 z-20 -mt-4 -ml-4"
    >
      <HiddenDie className="size-8 text-sm" />
    </motion.span>
  );
}

function SeatDice({
  dice,
  ownDice,
  matching,
}: {
  dice: number;
  ownDice: OwnDice | null;
  matching: readonly boolean[] | null;
}) {
  if (ownDice === null) {
    return (
      <span role="img" aria-label={tableCopy.hiddenDice(dice)} className="flex gap-1">
        {Array.from({ length: dice }, (_, index) => (
          <HiddenDie key={index} className="size-6 text-xs" />
        ))}
      </span>
    );
  }
  if (ownDice.status === "ready") {
    return (
      <span className="flex gap-1.5">
        {ownDice.faces.map((face: Face, index) => (
          <span
            key={index}
            role="img"
            aria-label={tableCopy.faceWords[face - 1]}
            className={cn(
              "rounded-[24%] transition-transform",
              matching?.[index] && "-translate-y-1 ring-3 ring-seat-green"
            )}
          >
            <DieFace face={face} className="size-9" />
          </span>
        ))}
      </span>
    );
  }
  if (ownDice.status === "locked") {
    return (
      <ActionButton
        tone="yellow"
        size="small"
        icon="lock"
        title={tableCopy.diceLocked}
        working={ownDice.unlocking}
        workingLabel={tableCopy.unlockingDice}
        onClick={ownDice.unlock}
      >
        {tableCopy.showMyDice}
      </ActionButton>
    );
  }
  if (ownDice.status === "failed") {
    return (
      <ActionButton
        tone="quiet"
        size="small"
        icon="target"
        title={tableCopy.diceProblem}
        onClick={ownDice.retry}
      >
        {tableCopy.tryAgain}
      </ActionButton>
    );
  }
  return (
    <span role="status" className="flex gap-1.5">
      <span className="sr-only">{tableCopy.rolling}</span>
      {Array.from({ length: dice }, (_, index) => (
        <span
          key={index}
          aria-hidden
          className="size-9 animate-pulse rounded-lg bg-muted calm:animate-none"
        />
      ))}
    </span>
  );
}
