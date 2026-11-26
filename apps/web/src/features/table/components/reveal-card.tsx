"use client";

import { cn } from "cn";
import { useState } from "react";
import { ActionButton } from "@/components/shared/action-button";
import { DieFace } from "@/components/shared/die";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Face } from "@bluff/game";
import { tableCopy } from "../copy";

interface RevealRow {
  seat: number;
  name: string;
  isMe: boolean;
  faces: readonly Face[];
  counting: readonly boolean[];
  matches: number;
  role: "bidder" | "caller" | null;
}

export interface Reveal {
  outcome: "holds" | "caught";
  quantity: number;
  face: number;
  count: number;
  loserName: string;
  loserIsMe: boolean;
  rows: readonly RevealRow[];
}

export function RevealCard({
  reveal,
  onContinue,
  onGone,
}: {
  reveal: Reveal | null;
  onContinue: () => void;
  onGone?: (event: Event) => void;
}) {
  const faceWord = (face: number) => tableCopy.faceWords[face - 1] ?? String(face);
  const [last, setLast] = useState(reveal);
  if (reveal !== null && reveal !== last) setLast(reveal);
  const shown = reveal ?? last;
  return (
    <Dialog open={reveal !== null} onOpenChange={(open) => (open ? undefined : onContinue())}>
      <DialogContent className="sm:max-w-md" onCloseAutoFocus={(event) => onGone?.(event)}>
        {shown ? (
          <PatternFrame roomy>
            <div className="flex flex-col items-center gap-5 text-center">
              <DialogTitle
                className={cn(
                  "-rotate-2 rounded-xl border-4 px-4 py-1 font-heading text-3xl uppercase",
                  shown.outcome === "caught"
                    ? "border-destructive text-destructive-text"
                    : "border-seat-green text-seat-green-text"
                )}
              >
                {shown.outcome === "caught" ? tableCopy.bluffCaught : tableCopy.bidHolds}
              </DialogTitle>
              <DialogDescription className="text-base">
                {tableCopy.roundResult(shown.count, faceWord(shown.face))}{" "}
                {shown.loserIsMe ? tableCopy.youLostADie : tableCopy.lostADie(shown.loserName)}
              </DialogDescription>
              <p className="rounded-xl bg-muted/60 px-3 py-2 font-game text-base">
                {shown.outcome === "caught"
                  ? tableCopy.whyCaught(shown.quantity, shown.count)
                  : tableCopy.whyHolds(shown.quantity, shown.count)}
              </p>
              {shown.rows.length > 0 ? (
                <ul className="flex w-full flex-col gap-2">
                  {shown.rows.map((row) => (
                    <li
                      key={row.seat}
                      className="flex flex-col gap-2 rounded-xl bg-muted/60 px-3 py-2"
                    >
                      <span className="flex items-center justify-between gap-2 text-sm">
                        <span className="flex items-center gap-2 font-game">
                          {row.isMe ? tableCopy.you : row.name}
                          {row.role ? (
                            <span className="rounded-full bg-tile px-2 text-xs text-tile-foreground">
                              {row.role === "bidder" ? tableCopy.bidderTag : tableCopy.callerTag}
                            </span>
                          ) : null}
                        </span>
                        <span className="font-game text-seat-green-text">
                          {tableCopy.matched(row.matches)}
                        </span>
                      </span>
                      <span className="flex flex-wrap gap-1.5">
                        {row.faces.map((face, index) => (
                          <span
                            key={index}
                            role="img"
                            aria-label={tableCopy.faceWords[face - 1]}
                            className={cn(
                              "rounded-[24%]",
                              row.counting[index] ? "ring-3 ring-seat-green" : "opacity-55"
                            )}
                          >
                            <DieFace face={face} className="size-8" />
                          </span>
                        ))}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
              <ActionButton tone="green" icon="tick" onClick={onContinue}>
                {tableCopy.continueGame}
              </ActionButton>
            </div>
          </PatternFrame>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
