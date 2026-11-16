"use client";

import { cn } from "cn";
import { motion } from "motion/react";
import { DieFace } from "@/components/shared/die";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import type { Face } from "@/lib/dice-physics";
import type { ThrowState } from "../../hooks/use-dice-throw";
import { cupMotion } from "../../lib/cup-motion";
import type { RevealedSeat } from "../../lib/reveal";
import type { SeatColor, SeatPlacement } from "../../lib/seat-layout";

const BOARD_SIZE = 7.6;
const ROW_PULL = 0.6;
const STACK_SHOWN = 5;

const SEAT_FILL: Record<SeatColor, string> = {
  red: "bg-seat-red border-seat-red-edge",
  green: "bg-seat-green border-seat-green-edge",
  yellow: "bg-seat-yellow border-seat-yellow-edge",
  blue: "bg-seat-blue border-seat-blue-edge",
};

const CORNERS: { color: SeatColor; place: string }[] = [
  { color: "red", place: "bottom-[6%] left-[6%]" },
  { color: "green", place: "top-[6%] left-[6%]" },
  { color: "yellow", place: "top-[6%] right-[6%]" },
  { color: "blue", place: "right-[6%] bottom-[6%]" },
];

const POT_SPOTS = [
  "left-[44%] top-[56%]",
  "left-[56%] top-[44%]",
  "left-[44%] top-[44%]",
  "left-[56%] top-[56%]",
];

function spot(seat: SeatPlacement, pull = 1) {
  const [x, , z] = seat.cup;
  return {
    left: `${50 + ((x * pull) / BOARD_SIZE) * 100}%`,
    top: `${50 + ((z * pull) / BOARD_SIZE) * 100}%`,
  };
}

function DiceRow({
  faces,
  counting,
  seat,
  attribute,
}: {
  faces: readonly Face[];
  counting?: readonly boolean[];
  seat: SeatPlacement;
  attribute: "data-thrown" | "data-revealed";
}) {
  const calm = useCalmMotion();
  return (
    <div
      {...{ [attribute]: seat.side }}
      style={spot(seat, ROW_PULL)}
      className="absolute flex -translate-x-1/2 -translate-y-1/2 gap-1"
    >
      {faces.map((face, index) => (
        <motion.span
          key={index}
          data-face={face}
          data-counting={counting ? String(counting[index] ?? false) : undefined}
          initial={calm ? { opacity: 0 } : { rotateY: 90, opacity: 0 }}
          animate={{ rotateY: 0, opacity: 1 }}
          transition={calm ? { duration: 0.18 } : { duration: 0.35, delay: index * 0.06 }}
          className={cn(
            "rounded-[24%]",
            counting?.[index] &&
              "shadow-[0_0_14px_var(--color-pattern-accent)] ring-3 ring-pattern-accent"
          )}
        >
          <DieFace face={face} className="size-[min(7cqw,2.4rem)]" />
        </motion.span>
      ))}
    </div>
  );
}

function Cup({ seat, state }: { seat: SeatPlacement; state: "still" | "shaking" | "lifted" }) {
  const calm = useCalmMotion();
  return (
    <motion.div
      data-cup={state}
      data-side={seat.side}
      data-color={seat.color}
      style={spot(seat)}
      animate={
        state === "lifted"
          ? { y: calm ? 0 : -18, opacity: 0.45, rotate: 0 }
          : state === "shaking" && !calm
            ? { y: 0, opacity: 1, rotate: [0, -9, 8, -6, 5, 0] }
            : { y: 0, opacity: 1, rotate: 0 }
      }
      transition={
        state === "shaking" && !calm
          ? { duration: 0.45, repeat: Infinity, ease: "easeInOut" }
          : { duration: calm ? 0.18 : 0.3 }
      }
      className="absolute size-[17%] -translate-x-1/2 -translate-y-1/2"
    >
      <span className="block size-full rounded-full border-4 border-board-edge bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklab,var(--color-pattern-accent)_70%,white),var(--color-pattern-accent)_55%,color-mix(in_oklab,var(--color-pattern-accent)_55%,var(--color-board-edge)))] shadow-[0_6px_0_0_var(--color-board-edge),0_12px_18px_-6px_rgb(0_0_0/0.5)]">
        <span className="absolute inset-[22%] rounded-full border-2 border-dashed border-board-edge/60" />
      </span>
    </motion.div>
  );
}

function ChipStack({ color, count, place }: { color: SeatColor; count: number; place: string }) {
  return (
    <div
      data-chip-stack
      className={cn("absolute size-[7%] -translate-x-1/2 -translate-y-1/2", place)}
    >
      {Array.from({ length: Math.min(count, STACK_SHOWN) }, (_, level) => (
        <span
          key={level}
          style={{ transform: `translateY(${-level * 18}%)` }}
          className={cn("absolute inset-0 rounded-full border-2", SEAT_FILL[color])}
        />
      ))}
    </div>
  );
}

export function FlatBoard({
  seats,
  throwState,
  chipsEach,
  revealed,
  revealedDice = null,
  ownSeat = 0,
  othersShaking = false,
  label,
}: {
  seats: SeatPlacement[];
  throwState: ThrowState;
  chipsEach: number;
  revealed: boolean;
  revealedDice?: readonly (RevealedSeat | null)[] | null;
  ownSeat?: number | null;
  othersShaking?: boolean;
  label: string;
}) {
  const own = ownSeat === null ? undefined : seats[ownSeat];
  return (
    <div
      role="img"
      aria-label={label}
      className="[container-type:inline-size] aspect-square w-full p-[4%]"
    >
      <div
        aria-hidden
        className="relative size-full rounded-[5%] border-[min(2.5cqw,14px)] border-board-edge bg-board shadow-[inset_0_0_0_3px_rgb(0_0_0/0.25),0_6px_0_0_var(--color-board-edge),0_14px_20px_-12px_rgb(0_0_0/0.5)]"
      >
        {CORNERS.map((corner) => (
          <span
            key={corner.color}
            className={cn(
              "absolute size-[13%] rounded-md border-2 opacity-90",
              SEAT_FILL[corner.color],
              corner.place
            )}
          />
        ))}
        <span className="absolute top-1/2 left-1/2 size-[24%] -translate-x-1/2 -translate-y-1/2 rounded-full border-4 border-pattern-accent/80" />
        {chipsEach > 0
          ? seats.map((seat, index) => (
              <ChipStack
                key={seat.color}
                color={seat.color}
                count={chipsEach}
                place={POT_SPOTS[index] ?? POT_SPOTS[0] ?? ""}
              />
            ))
          : null}
        {seats.map((seat, index) => {
          const motion = cupMotion({
            index,
            ownSeat,
            throwKind: throwState.kind,
            revealed,
            othersShaking,
          });
          return (
            <Cup
              key={seat.side}
              seat={seat}
              state={motion.lifted ? "lifted" : motion.shaking ? "shaking" : "still"}
            />
          );
        })}
        {revealedDice?.map((row, index) => {
          const seat = seats[index];
          return row && seat ? (
            <DiceRow
              key={seat.side}
              seat={seat}
              faces={row.faces}
              counting={row.counting}
              attribute="data-revealed"
            />
          ) : null;
        })}
        {throwState.kind === "rolling" && !revealedDice && own ? (
          <DiceRow
            seat={own}
            faces={throwState.result.dice.map((die) => die.landedFace)}
            attribute="data-thrown"
          />
        ) : null}
      </div>
    </div>
  );
}
