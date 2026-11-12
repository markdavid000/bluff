"use client";

import { useSessionKeeper } from "../hooks/use-session-keeper";
import { useWalletKeeper } from "../hooks/use-wallet-keeper";

export function SessionKeeper() {
  useSessionKeeper();
  useWalletKeeper();
  return null;
}
