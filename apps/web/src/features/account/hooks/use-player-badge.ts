"use client";

import { useState } from "react";
import { usePlayer } from "./use-player";
import { useProfileEdit } from "./use-profile-edit";
import { useSignOut } from "./use-sign-out";

export function usePlayerBadge() {
  const [open, setOpen] = useState(false);
  const player = usePlayer();
  const { working, signOut } = useSignOut();
  const profile = useProfileEdit();
  return { player, signOut, signingOut: working, open, setOpen, profile };
}
