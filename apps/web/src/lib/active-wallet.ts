interface WalletLike {
  address: string;
}

export function activeWalletFor<Wallet extends WalletLike>({
  wallets,
  user,
}: {
  wallets: Wallet[];
  user: { wallet?: WalletLike } | null;
}): Wallet | undefined {
  const signedIn = user?.wallet?.address.toLowerCase();
  if (!signedIn) return undefined;
  return wallets.find((wallet) => wallet.address.toLowerCase() === signedIn);
}

export function isSponsoredWallet(wallet: { walletClientType: string } | undefined): boolean {
  return wallet?.walletClientType === "privy";
}
