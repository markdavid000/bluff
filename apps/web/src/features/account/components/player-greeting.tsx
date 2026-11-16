"use client";

import { accountCopy } from "../copy";
import { usePlayer } from "../hooks/use-player";

export function PlayerGreeting() {
  const player = usePlayer();
  return player.status === "ready" ? (
    <h1 className="text-center text-3xl">
      {accountCopy.readyToPlay(player.nickname ?? player.name)}
    </h1>
  ) : (
    <span
      aria-hidden
      className="mx-auto h-9 w-56 animate-pulse rounded-md bg-muted calm:animate-none"
    />
  );
}
