"use client";

import { usePrivy, useWallets } from "@privy-io/react-auth";
import { activeWalletFor, isSponsoredWallet } from "@/lib/active-wallet";

export function useMovesSponsored(): boolean {
  const { user } = usePrivy();
  const { wallets } = useWallets();
  return isSponsoredWallet(activeWalletFor({ wallets, user }));
}
