"use client";

import { usePlayer } from "./use-player";
import { useSignOut } from "./use-sign-out";

export function usePlayerBadge() {
  const player = usePlayer();
  const { working, signOut } = useSignOut();
  return { player, signOut, signingOut: working };
}
