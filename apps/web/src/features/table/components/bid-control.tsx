"use client";

import { cn } from "cn";
import type { Ref } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { DieFace } from "@/components/shared/die";
import { BID_FACES, type Bid } from "@bluff/game";
import { tableCopy } from "../copy";
import type { useBidChoice } from "../hooks/use-bid-choice";

type Choice = ReturnType<typeof useBidChoice>;

function plural(face: number) {
  return tableCopy.facePlurals[face - 1] ?? String(face);
}

export function BidControl({
  choice,
  bid,
  bidderName,
  placing,
  calling,
  confirm,
  busy,
  onRaise,
  onCall,
  actionRef,
  compact = false,
}: {
  choice: Choice;
  bid: Bid | null;
  bidderName: string | null;
  placing: boolean;
  calling: boolean;
  confirm: boolean;
  busy: boolean;
  onRaise: (bid: Bid) => void;
  onCall: () => void;
  actionRef?: Ref<HTMLButtonElement>;
  compact?: boolean;
}) {
  const chosen = choice.choice;
  const label = (working: string) => (confirm ? tableCopy.confirmInWallet : working);
  const stepButton = cn(
    "rounded-lg bg-tile font-game text-xl text-tile-foreground disabled:opacity-35",
    compact ? "size-11" : "size-9 pointer-coarse:size-11"
  );
  const quantity = chosen ? (
    <div
      className={cn("flex items-center gap-1 rounded-xl bg-muted/60", compact ? "p-0.5" : "p-1")}
    >
      <button
        type="button"
        aria-label={tableCopy.oneFewer}
        disabled={!choice.canFewer || busy}
        onClick={choice.fewer}
        className={stepButton}
      >
        {tableCopy.fewerMark}
      </button>
      <span aria-live="polite" className="w-9 text-center font-heading text-2xl">
        {chosen.quantity}
      </span>
      <button
        type="button"
        aria-label={tableCopy.oneMore}
        disabled={!choice.canMore || busy}
        onClick={choice.more}
        className={stepButton}
      >
        {tableCopy.moreMark}
      </button>
    </div>
  ) : null;
  const faces = chosen ? (
    <div role="group" aria-label={tableCopy.yourBid} className="flex items-center gap-1.5">
      {BID_FACES.map((face) => (
        <button
          key={face}
          type="button"
          aria-label={tableCopy.pickFace(plural(face))}
          aria-pressed={chosen.face === face}
          disabled={!choice.faceAvailable(face) || busy}
          onClick={() => choice.setFace(face)}
          className={cn(
            "rounded-[24%] p-0.5 transition-transform disabled:opacity-30",
            chosen.face === face
              ? "-translate-y-0.5 ring-3 ring-seat-yellow"
              : "hover:-translate-y-0.5"
          )}
        >
          <DieFace face={face} className={compact ? "size-8" : "size-9"} />
        </button>
      ))}
    </div>
  ) : null;
  const topBid = bid ? <p className="font-game text-lg">{tableCopy.topBid}</p> : null;
  const raise = chosen ? (
    <ActionButton
      tone="green"
      icon="play"
      sound="knock"
      size={compact ? "small" : "medium"}
      ref={actionRef}
      className="min-w-36"
      disabled={busy && !placing}
      working={placing}
      workingLabel={label(tableCopy.placingBid)}
      onClick={() => onRaise(chosen)}
    >
      {tableCopy.raise}
    </ActionButton>
  ) : null;
  const call =
    bid && bidderName ? (
      <ActionButton
        tone="danger"
        icon="megaphone"
        sound="drum"
        size={compact ? "small" : "medium"}
        ref={chosen ? undefined : actionRef}
        className="min-w-36"
        disabled={busy && !calling}
        working={calling}
        workingLabel={label(tableCopy.callingBluff)}
        onClick={onCall}
      >
        {tableCopy.callBluffOn(bidderName)}
      </ActionButton>
    ) : null;

  if (compact) {
    return (
      <section className="flex w-full max-w-xl flex-col items-center gap-2">
        {faces ?? topBid}
        <div className="flex w-full flex-wrap items-center justify-center gap-2">
          {quantity}
          {raise}
          {call}
        </div>
      </section>
    );
  }
  return (
    <section className="flex w-full max-w-xl flex-col items-center gap-3">
      {chosen ? (
        <div className="flex flex-wrap items-center justify-center gap-3">
          {quantity}
          {faces}
        </div>
      ) : (
        topBid
      )}
      <div className="flex w-full flex-wrap items-center justify-center gap-3">
        {raise}
        {call}
      </div>
    </section>
  );
}
