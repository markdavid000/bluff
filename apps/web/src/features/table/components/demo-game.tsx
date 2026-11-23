"use client";

import type { Bid, Face } from "@bluff/game";
import { cn } from "cn";
import { AnimatePresence, motion } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import { useThemeColors } from "@/hooks/use-theme-colors";
import { tableCopy } from "../copy";
import { type DemoStep, useDemoRound } from "../hooks/use-demo-round";
import { useGameBoard } from "../hooks/use-game-board";
import { seatLayout } from "../lib/seat-layout";
import { GameBoard } from "./board/game-board";
import { CurrentBid } from "./current-bid";
import { GameSeat } from "./game-seat";

const SLOT: Record<"top" | "left" | "right" | "bottom", string> = {
  top: "col-start-2 row-start-1 justify-self-center",
  left: "col-start-1 row-start-2 justify-self-end",
  right: "col-start-3 row-start-2 justify-self-start",
  bottom: "col-start-2 row-start-3 justify-self-center",
};

const FIVES = 5;
const LAYOUT = seatLayout(4, 0);
const LOSER = 3;

const YOUR_DICE: readonly Face[] = [5, 3];

const PLAYERS: readonly { avatar: number; dice: readonly Face[] }[] = [
  { avatar: 1, dice: YOUR_DICE },
  { avatar: 7, dice: [1, 6] },
  { avatar: 3, dice: [5, 2] },
  { avatar: 10, dice: [3, 4] },
];

const BIDS: readonly { step: DemoStep; seat: number; quantity: number }[] = [
  { step: "bid1", seat: 1, quantity: 2 },
  { step: "bid2", seat: 2, quantity: 3 },
  { step: "bid3", seat: 3, quantity: 4 },
];

const ORDER: readonly DemoStep[] = ["deal", "bid1", "bid2", "bid3", "call", "reveal", "result"];
const TURN: Partial<Record<DemoStep, number>> = { bid1: 1, bid2: 2, bid3: 3, call: 0 };

function reached(step: DemoStep, target: DemoStep): boolean {
  return ORDER.indexOf(step) >= ORDER.indexOf(target);
}

function counts(face: Face): boolean {
  return face === FIVES || face === 1;
}

export function DemoGame() {
  const { step, round } = useDemoRound();
  const { throwState, othersShaking } = useGameBoard({
    round,
    faces: YOUR_DICE,
    placement: LAYOUT[0] ?? null,
    quiet: true,
  });
  const colors = useThemeColors();
  const calm = useCalmMotion();
  const open = step === "reveal" || step === "result";
  const placed = BIDS.filter((bid) => reached(step, bid.step));
  const latest = placed.at(-1);
  const current: Bid | null = latest ? { quantity: latest.quantity, face: FIVES } : null;
  const diceOf = (seat: number) =>
    PLAYERS[seat]?.dice.slice(0, step === "result" && seat === LOSER ? 1 : undefined) ?? [];
  const revealedDice = open
    ? PLAYERS.map((_, seat) => {
        const faces = [...diceOf(seat)];
        return { faces, counting: faces.map(counts) };
      })
    : null;

  return (
    <div
      role="img"
      aria-label={tableCopy.demoLabel}
      className="flex w-full max-w-[38rem] flex-col items-center gap-1"
    >
      <div aria-hidden className="flex min-h-12 items-center">
        <CurrentBid
          bid={current}
          bidderName={latest ? tableCopy.demoNames[LAYOUT[latest.seat]?.side ?? "bottom"] : null}
        />
      </div>
      <div
        aria-hidden
        className="grid w-full grid-cols-[minmax(4.5rem,auto)_minmax(0,1fr)_minmax(4.5rem,auto)] grid-rows-[auto_minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1"
      >
        {LAYOUT.map((placement, seat) => {
          const bid = [...placed].reverse().find((entry) => entry.seat === seat);
          const calling = step === "call" && seat === 0;
          return (
            <div key={placement.side} className={cn("relative", SLOT[placement.side])}>
              <GameSeat
                name={tableCopy.demoNames[placement.side]}
                avatarSrc={`/avatars/${PLAYERS[seat]?.avatar ?? 1}.svg`}
                isMe={seat === 0}
                isComputer={false}
                dice={diceOf(seat).length}
                isActive
                isTurn={TURN[step] === seat}
                turnFraction={1}
                lastBid={bid ? { quantity: bid.quantity, face: FIVES } : null}
                ownDice={seat === 0 ? { status: "ready", faces: [...YOUR_DICE] } : null}
                matching={null}
                holdDice={step !== "result" && step !== "deal"}
              />
              <AnimatePresence>
                {calling ? (
                  <motion.span
                    key="call"
                    initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.6, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="absolute top-0 left-full z-20 ml-2 rounded-2xl border-2 border-seat-red-edge bg-seat-red px-3 py-1.5 font-game text-lg leading-none whitespace-nowrap text-seat-foreground shadow-[0_3px_0_0_var(--color-seat-red-edge)]"
                  >
                    {tableCopy.demoCall}
                  </motion.span>
                ) : null}
              </AnimatePresence>
            </div>
          );
        })}
        <div className="[container-type:size] relative col-start-2 row-start-2 flex aspect-square w-full items-center justify-center">
          <GameBoard
            colors={colors}
            seats={LAYOUT}
            throwState={throwState}
            chipsEach={0}
            revealed={open}
            revealedDice={revealedDice}
            ownSeat={0}
            othersShaking={othersShaking}
            label={tableCopy.boardLabel}
          />
          <AnimatePresence>
            {step === "result" ? (
              <motion.span
                key="result"
                initial={calm ? { opacity: 0 } : { opacity: 0, scale: 0.7 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                className="pointer-events-none absolute top-1/2 left-1/2 z-10 w-max max-w-[70%] -translate-x-1/2 -translate-y-1/2 rounded-xl border-2 border-tile-edge bg-tile px-4 py-2 text-center font-game text-lg leading-tight text-tile-foreground shadow-[0_4px_0_0_var(--color-tile-edge)]"
              >
                {tableCopy.demoResult}
              </motion.span>
            ) : null}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
