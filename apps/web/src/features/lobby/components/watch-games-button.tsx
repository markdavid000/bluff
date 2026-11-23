"use client";

import { ActionButton } from "@/components/shared/action-button";
import { Appear } from "@/components/shared/appear";
import { lobbyCopy } from "../copy";
import type { GamesInPlay } from "../hooks/use-games-in-play";

export function WatchGamesButton({
  games,
  disabled = false,
  onOpen,
}: {
  games: GamesInPlay;
  disabled?: boolean;
  onOpen: () => void;
}) {
  const count = games.status === "ready" ? games.games.length : null;
  return (
    <span className="relative inline-flex">
      <ActionButton
        tone="quiet"
        icon="zoom"
        disabled={disabled}
        aria-label={
          count === null
            ? lobbyCopy.watchGame
            : `${lobbyCopy.watchGame}, ${lobbyCopy.gamesInPlayCount(count)}`
        }
        onClick={onOpen}
      >
        {lobbyCopy.watchGame}
      </ActionButton>
      <Appear
        show={count !== null && count > 0}
        inline
        pop
        className="pointer-events-none absolute -top-2 -right-2 flex size-7"
      >
        <span
          aria-hidden
          className="inline-flex size-7 items-center justify-center rounded-full border-2 border-background bg-seat-blue font-game text-sm text-seat-foreground tabular-nums"
        >
          {count}
        </span>
      </Appear>
    </span>
  );
}
