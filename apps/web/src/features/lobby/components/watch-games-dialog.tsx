"use client";

import { ActionButton } from "@/components/shared/action-button";
import { PatternFrame } from "@/components/shared/pattern-band";
import { Dialog, DialogClose, DialogContent, DialogTitle } from "@/components/ui/dialog";
import { lobbyCopy } from "../copy";
import type { GamesInPlay } from "../hooks/use-games-in-play";
import { EmptyTablesArt } from "./empty-tables-art";
import { LiveGameCard } from "./live-game-card";

export function WatchGamesDialog({
  open,
  onOpenChange,
  games,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  games: GamesInPlay;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="sm:max-w-6xl">
        <PatternFrame roomy>
          <div className="flex flex-col gap-8">
            <div className="flex items-center justify-between gap-4">
              <DialogTitle>{lobbyCopy.watchGame}</DialogTitle>
              <DialogClose asChild>
                <ActionButton tone="quiet" size="small" icon="back">
                  {lobbyCopy.close}
                </ActionButton>
              </DialogClose>
            </div>
            {games.status === "ready" ? (
              games.games.length === 0 ? (
                <div className="flex flex-col items-center gap-6 py-4 text-center">
                  <EmptyTablesArt className="w-full max-w-sm" />
                  <p className="font-game text-2xl">{lobbyCopy.noGamesInPlay}</p>
                </div>
              ) : (
                <ul className="grid max-h-[60dvh] gap-5 overflow-y-auto p-1 pb-3 sm:grid-cols-2 lg:grid-cols-3">
                  {games.games.map((game) => (
                    <LiveGameCard key={game.id.toString()} game={game} />
                  ))}
                </ul>
              )
            ) : games.status === "failed" ? (
              <p className="flex items-center gap-3 text-base">
                {lobbyCopy.gamesInPlayProblem}
                <ActionButton tone="quiet" size="small" icon="target" onClick={games.retry}>
                  {lobbyCopy.tryAgain}
                </ActionButton>
              </p>
            ) : (
              <p
                role="status"
                className="h-40 animate-pulse rounded-2xl bg-muted calm:animate-none"
              >
                <span className="sr-only">{lobbyCopy.gamesInPlayLoading}</span>
              </p>
            )}
          </div>
        </PatternFrame>
      </DialogContent>
    </Dialog>
  );
}
