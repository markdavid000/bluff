"use client";

import { cn } from "cn";
import { motion, useReducedMotion } from "motion/react";
import { ActionButton } from "@/components/shared/action-button";
import { DieFace } from "@/components/shared/die";
import { PatternBand } from "@/components/shared/pattern-band";
import { isValidFace } from "@/lib/bid-rules";
import { tableCopy } from "../copy";
import type { RoundHistoryState } from "../hooks/use-round-history";
import type { HistoryBid, RoundEnd } from "../lib/round-history";

type NameOf = (player: string) => string;

function endLine(end: RoundEnd, nameOf: NameOf): string {
  if (end.kind === "timeout") return tableCopy.historyTimedOut(nameOf(end.player));
  return end.holds
    ? tableCopy.historyHeld(nameOf(end.loser))
    : tableCopy.historyCaught(nameOf(end.loser));
}

const SLIP =
  "rounded-xl bg-cowrie/10 px-3 py-2 shadow-[inset_0_1px_0_rgb(255_255_255/0.08),0_2px_0_0_rgb(0_0_0/0.25)]";

function BidLine({ bid, nameOf, latest }: { bid: HistoryBid; nameOf: NameOf; latest: boolean }) {
  const calm = useReducedMotion();
  return (
    <motion.li
      initial={calm ? false : { opacity: 0, x: -14, scale: 0.9 }}
      animate={{ opacity: 1, x: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 420, damping: 22 }}
      className={cn(
        "flex items-center gap-2",
        SLIP,
        latest && "bg-seat-yellow text-seat-yellow-foreground"
      )}
    >
      <span className="min-w-0 truncate">{tableCopy.historyBidder(nameOf(bid.player))}</span>
      <span className="sr-only">
        {tableCopy.bid(bid.quantity, tableCopy.faceWords[bid.face - 1] ?? String(bid.face))}
      </span>
      <span aria-hidden className="ml-auto flex shrink-0 items-center gap-1.5 font-game">
        {tableCopy.timesMark(bid.quantity)}
        {isValidFace(bid.face) ? <DieFace face={bid.face} className="size-6" /> : null}
      </span>
    </motion.li>
  );
}

function Body({ history, nameOf }: { history: RoundHistoryState; nameOf: NameOf }) {
  if (history.status === "loading") {
    return (
      <span
        role="status"
        className="block h-8 w-full animate-pulse rounded-xl bg-cowrie/15 motion-reduce:animate-none"
      >
        <span className="sr-only">{tableCopy.loading}</span>
      </span>
    );
  }
  if (history.status === "failed") {
    return (
      <div className="flex flex-col items-start gap-2">
        <p className="text-cowrie/80">{tableCopy.historyProblem}</p>
        <ActionButton tone="quiet" size="small" icon="target" onClick={history.retry}>
          {tableCopy.tryAgain}
        </ActionButton>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {history.rounds.map((round, index) => (
        <section key={round.round} className="flex flex-col gap-1.5">
          <h3 className="font-game text-xs tracking-wider text-cowrie/70 uppercase">
            {tableCopy.historyRound(round.round)}
          </h3>
          {index === 0 ? (
            round.bids.length > 0 ? (
              <ul className="flex flex-col gap-1.5">
                {round.bids.map((bid, at) => (
                  <BidLine
                    key={`${at}-${bid.player}`}
                    bid={bid}
                    nameOf={nameOf}
                    latest={at === round.bids.length - 1 && !round.end}
                  />
                ))}
              </ul>
            ) : round.end ? null : (
              <p
                className={cn(
                  SLIP,
                  "border border-dashed border-cowrie/30 bg-transparent text-cowrie/70 shadow-none"
                )}
              >
                {tableCopy.historyNoBids}
              </p>
            )
          ) : null}
          {round.end ? (
            <p className={cn(SLIP, "leading-snug")}>{endLine(round.end, nameOf)}</p>
          ) : null}
        </section>
      ))}
    </div>
  );
}

export function RoundHistory({ history, nameOf }: { history: RoundHistoryState; nameOf: NameOf }) {
  return (
    <div className="[perspective:900px]">
      <details
        open
        className={cn(
          "group w-72 origin-left overflow-hidden rounded-2xl border-2 border-board-edge bg-board text-sm text-cowrie",
          "shadow-[inset_0_1px_0_rgb(255_255_255/0.15),0_6px_0_0_var(--color-board-edge),0_18px_30px_-12px_rgb(0_0_0/0.5)]",
          "transition-transform duration-300 motion-safe:[transform:rotateY(10deg)_rotateX(3deg)] motion-safe:hover:[transform:rotateY(0deg)_rotateX(0deg)]"
        )}
      >
        <summary className="flex cursor-pointer list-none flex-col font-game text-base focus-visible:ring-4 focus-visible:ring-ring/60 focus-visible:outline-none focus-visible:ring-inset">
          <PatternBand className="block h-3 w-full" />
          <span className="flex items-center justify-between gap-2 px-4 py-2.5">
            {tableCopy.history}
            <span
              aria-hidden
              className="mb-1 size-2 rotate-45 border-r-2 border-b-2 border-current transition-transform group-open:mt-1 group-open:mb-0 group-open:-rotate-135 motion-reduce:transition-none"
            />
          </span>
        </summary>
        <div className="max-h-[26vh] [scrollbar-width:thin] overflow-y-auto px-4 pb-4">
          <Body history={history} nameOf={nameOf} />
        </div>
      </details>
    </div>
  );
}
