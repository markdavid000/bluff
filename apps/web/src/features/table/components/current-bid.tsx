"use client";

import { cn } from "cn";
import { motion } from "motion/react";
import { useCalmMotion } from "@/hooks/use-calm-motion";
import { Appear } from "@/components/shared/appear";
import { DieFace } from "@/components/shared/die";
import type { Bid } from "@/lib/bid-rules";
import { tableCopy } from "../copy";

const RAISED =
  "shadow-[inset_0_1px_0_rgb(255_255_255/0.4),0_4px_0_0_var(--color-seat-yellow-edge),0_8px_14px_-6px_rgb(0_0_0/0.4)]";

export function CurrentBid({ bid, bidderName }: { bid: Bid | null; bidderName: string | null }) {
  return (
    <Appear show swapKey={bid ? "bid" : "none"} inline>
      {bid ? <PlacedBid bid={bid} bidderName={bidderName} /> : <NoBid />}
    </Appear>
  );
}

function NoBid() {
  return (
    <span
      aria-live="polite"
      className="inline-flex h-12 items-center rounded-2xl border-2 border-dashed border-muted-foreground/50 px-3 font-game text-sm text-muted-foreground"
    >
      {tableCopy.noBidYet}
    </span>
  );
}

function PlacedBid({ bid, bidderName }: { bid: Bid; bidderName: string | null }) {
  const calm = useCalmMotion();
  return (
    <span aria-live="polite" className="relative inline-flex">
      <motion.span
        key={`${bid.quantity}-${bid.face}`}
        initial={calm ? false : { scale: 1.35, rotate: -4 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 420, damping: 16 }}
        className={cn(
          "inline-flex h-12 items-center gap-2 rounded-2xl border-2 border-seat-yellow-edge bg-seat-yellow pr-2 pl-3 text-seat-yellow-foreground",
          RAISED
        )}
      >
        <span aria-hidden className="flex flex-col leading-none">
          <span className="text-[0.65rem] font-bold tracking-wider uppercase opacity-80">
            {tableCopy.currentBidIs}
          </span>
          {bidderName ? (
            <span className="max-w-20 truncate font-game text-xs">{bidderName}</span>
          ) : null}
        </span>
        <span aria-hidden className="font-heading text-2xl leading-none">
          {tableCopy.timesMark(bid.quantity)}
        </span>
        <DieFace face={bid.face} className="size-8" />
        <span className="sr-only">
          {tableCopy.bid(bid.quantity, tableCopy.faceWords[bid.face - 1] ?? String(bid.face))}
        </span>
      </motion.span>
    </span>
  );
}
