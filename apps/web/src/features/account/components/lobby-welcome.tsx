"use client";

import { PatternFrame } from "@/components/shared/pattern-band";
import { accountCopy } from "../copy";
import { usePlayer } from "../hooks/use-player";

export function LobbyWelcome() {
  const player = usePlayer();
  return (
    <PatternFrame className="w-full max-w-2xl">
      <div className="flex flex-col gap-3 py-2">
        {player.status === "ready" ? (
          <h1 className="text-4xl">{accountCopy.welcomeBack(player.name)}</h1>
        ) : (
          <span aria-hidden className="h-10 w-64 animate-pulse rounded-md bg-muted" />
        )}
        <p className="text-base text-muted-foreground">{accountCopy.lobbyComingSoon}</p>
      </div>
    </PatternFrame>
  );
}
