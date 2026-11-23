"use client";

import type { Face } from "@bluff/game";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import { Avatar } from "@/components/shared/avatar";
import { Cowrie } from "@/components/shared/cowrie";
import { DieFace } from "@/components/shared/die";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import { landingCopy } from "../copy";
import type { DemoStep } from "../hooks/use-demo-round";

type Side = "top" | "left" | "right" | "bottom";

interface DemoSeat {
  side: Side;
  avatar: number;
  dice: readonly [Face, Face];
  seat: string;
  cup: string;
  bubble: string;
}

const SEATS: readonly DemoSeat[] = [
  {
    side: "top",
    avatar: 3,
    dice: [5, 2],
    seat: "left-1/2 top-[7%]",
    cup: "left-1/2 top-[31%]",
    bubble: "left-full top-0 ml-2",
  },
  {
    side: "left",
    avatar: 7,
    dice: [1, 6],
    seat: "left-[8%] top-1/2",
    cup: "left-[31%] top-1/2",
    bubble: "left-1/2 bottom-full mb-2 -translate-x-1/4",
  },
  {
    side: "right",
    avatar: 10,
    dice: [3, 4],
    seat: "left-[92%] top-1/2",
    cup: "left-[69%] top-1/2",
    bubble: "right-1/2 bottom-full mb-2 translate-x-1/4",
  },
  {
    side: "bottom",
    avatar: 1,
    dice: [5, 3],
    seat: "left-1/2 top-[93%]",
    cup: "left-1/2 top-[69%]",
    bubble: "left-full top-0 ml-2",
  },
];

const SPEAKER: Partial<Record<DemoStep, { side: Side; quantity: number | null }>> = {
  bid1: { side: "left", quantity: 2 },
  bid2: { side: "top", quantity: 3 },
  bid3: { side: "right", quantity: 4 },
  call: { side: "bottom", quantity: null },
};

const CURRENT_BID: Partial<Record<DemoStep, number>> = {
  bid1: 2,
  bid2: 3,
  bid3: 4,
  call: 4,
  reveal: 4,
};

const LOSER: Side = "right";
const COUNTING: readonly Face[] = [5, 1];

export function DemoTable({ step }: { step: DemoStep }) {
  const calm = useCalmMotion();
  const open = step === "reveal" || step === "result";
  const speaker = SPEAKER[step];
  const said =
    speaker === undefined
      ? null
      : speaker.quantity === null
        ? landingCopy.demoCall
        : landingCopy.demoBid(speaker.quantity);
  const bid = CURRENT_BID[step];
  const pop = calm
    ? { initial: { opacity: 0 }, animate: { opacity: 1 }, exit: { opacity: 0 } }
    : {
        initial: { opacity: 0, scale: 0.6, y: 6 },
        animate: { opacity: 1, scale: 1, y: 0 },
        exit: { opacity: 0, scale: 0.8 },
      };

  return (
    <div
      role="img"
      aria-label={landingCopy.demoLabel}
      className="[container-type:inline-size] relative aspect-square w-full max-w-[34rem]"
    >
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-[17%] rounded-[6%] border-[2.2cqw] border-board-edge bg-board shadow-[inset_0_0_0_3px_rgb(0_0_0/0.25),0_6px_0_0_var(--color-board-edge),0_18px_28px_-12px_rgb(0_0_0/0.55)]">
          <span className="absolute top-[6%] left-[6%] size-[13%] rounded-md border-2 border-seat-green-edge bg-seat-green opacity-90" />
          <span className="absolute top-[6%] right-[6%] size-[13%] rounded-md border-2 border-seat-yellow-edge bg-seat-yellow opacity-90" />
          <span className="absolute bottom-[6%] left-[6%] size-[13%] rounded-md border-2 border-seat-red-edge bg-seat-red opacity-90" />
          <span className="absolute right-[6%] bottom-[6%] size-[13%] rounded-md border-2 border-seat-blue-edge bg-seat-blue opacity-90" />
          <span className="absolute top-1/2 left-1/2 size-[30%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-pattern-accent/80" />
          <span className="absolute top-[40%] left-[38%]">
            <Cowrie size={22} />
          </span>
          <span className="absolute top-[52%] left-[50%] rotate-45">
            <Cowrie size={22} />
          </span>
        </div>

        {SEATS.map((seat) => (
          <div
            key={`cup-${seat.side}`}
            className={cn("absolute -translate-x-1/2 -translate-y-1/2", seat.cup)}
          >
            <div className="flex gap-[0.8cqw]">
              {seat.dice.map((face, index) => {
                const counts = COUNTING.includes(face);
                const lost = step === "result" && seat.side === LOSER && index === 1;
                return (
                  <motion.span
                    key={index}
                    data-demo-die
                    data-shown={open}
                    data-counts={open && counts}
                    animate={
                      lost && !calm
                        ? { opacity: 0, x: 40, y: 30, rotate: 200 }
                        : { opacity: open ? (lost ? 0.25 : 1) : 0, x: 0, y: 0, rotate: 0 }
                    }
                    transition={{ duration: lost ? 0.9 : 0.35 }}
                    className={cn(
                      "block rounded-[22%]",
                      open && counts && "ring-[0.8cqw] ring-seat-green"
                    )}
                  >
                    <DieFace face={face} className="size-[6.5cqw]" />
                  </motion.span>
                );
              })}
            </div>
            <motion.span
              animate={
                open
                  ? {
                      y: calm ? 0 : "-70%",
                      scale: calm ? 1 : 0.85,
                      opacity: 0,
                      rotate: calm ? 0 : -10,
                    }
                  : step === "deal" && !calm
                    ? { y: 0, opacity: 1, rotate: [0, -8, 7, -5, 0] }
                    : { y: 0, scale: 1, opacity: 1, rotate: 0 }
              }
              transition={{ duration: step === "deal" ? 0.6 : 0.45 }}
              className="absolute top-1/2 left-1/2 block size-[15cqw] -translate-x-1/2 -translate-y-1/2 rounded-full border-[0.9cqw] border-board-edge bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklab,var(--color-pattern-accent)_70%,white),var(--color-pattern-accent)_55%,color-mix(in_oklab,var(--color-pattern-accent)_55%,var(--color-board-edge)))] shadow-[0_6px_0_0_var(--color-board-edge),0_12px_18px_-6px_rgb(0_0_0/0.5)]"
            >
              <span className="absolute inset-[22%] rounded-full border-2 border-dashed border-board-edge/60" />
            </motion.span>
          </div>
        ))}

        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
          <AnimatePresence mode="popLayout">
            {bid !== undefined ? (
              <motion.span
                key={`bid-${bid}`}
                {...pop}
                className="flex items-center gap-1.5 rounded-full border-2 border-seat-yellow-edge bg-seat-yellow py-1 pr-1.5 pl-3 font-game text-[3.4cqw] leading-none whitespace-nowrap text-seat-yellow-foreground shadow-[0_3px_0_0_var(--color-seat-yellow-edge)]"
              >
                {landingCopy.demoBid(bid)}
              </motion.span>
            ) : step === "result" ? (
              <motion.span
                key="result"
                {...pop}
                className="block w-[26cqw] rounded-xl border-2 border-tile-edge bg-tile px-2 py-1.5 text-center font-game text-[3cqw] leading-tight text-tile-foreground shadow-[0_4px_0_0_var(--color-tile-edge)]"
              >
                {landingCopy.demoResult}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>

        {SEATS.map((seat) => {
          const speaking = speaker?.side === seat.side;
          const out = step === "result" && seat.side === LOSER;
          return (
            <div
              key={`seat-${seat.side}`}
              className={cn(
                "absolute flex -translate-x-1/2 -translate-y-1/2 flex-col items-center gap-1",
                seat.seat
              )}
            >
              <motion.span
                animate={
                  speaking && !calm
                    ? { y: [0, -6, 0] }
                    : out && !calm
                      ? { rotate: [0, -6, 6, 0] }
                      : { y: 0 }
                }
                transition={{ duration: 0.5 }}
                className="relative"
              >
                <Avatar
                  src={`/avatars/${seat.avatar}.svg`}
                  size={56}
                  className={cn(
                    "size-[12cqw]",
                    seat.side === "bottom" && "ring-4 ring-seat-yellow",
                    speaking && "ring-4 ring-seat-green"
                  )}
                />
                <AnimatePresence>
                  {speaking ? (
                    <motion.span
                      key={step}
                      {...pop}
                      className={cn(
                        "absolute z-10 rounded-2xl border-2 px-3 py-1.5 font-game text-[3.6cqw] leading-none whitespace-nowrap shadow-[0_3px_0_0_var(--color-tile-edge)]",
                        speaker?.quantity === null
                          ? "border-seat-red-edge bg-seat-red text-seat-foreground"
                          : "border-tile-edge bg-card text-card-foreground",
                        seat.bubble
                      )}
                    >
                      {said}
                    </motion.span>
                  ) : null}
                </AnimatePresence>
              </motion.span>
              <span className="rounded-full bg-tile px-2 font-game text-[2.8cqw] leading-tight text-tile-foreground shadow-[0_2px_0_0_var(--color-tile-edge)]">
                {landingCopy.demoNames[seat.side]}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
