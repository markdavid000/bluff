"use client";

import { useState } from "react";
import { usePlayer } from "./use-player";
import { useSignOut } from "./use-sign-out";

export function usePlayerBadge() {
  const [open, setOpen] = useState(false);
  const player = usePlayer();
  const { working, signOut } = useSignOut();
  return { player, signOut, signingOut: working, open, setOpen };
}
