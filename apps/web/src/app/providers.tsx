"use client";

import { PrivyProvider } from "@privy-io/react-auth";
import { WagmiProvider, createConfig } from "@privy-io/wagmi";
import { QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode } from "react";
import { GameToaster } from "@/components/shared/notify";
import { gameChain, gameTransport } from "@/config/chain";
import { publicEnv } from "@/config/env";
import { SessionKeeper } from "@/features/account";
import { activeWalletFor } from "@/lib/active-wallet";
import { createQueryClient } from "@/lib/query-client";
import { GameZamaProvider } from "./zama-provider";

const wagmiConfig = createConfig({
  chains: [gameChain],
  transports: { [gameChain.id]: gameTransport },
});

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(createQueryClient);
  return (
    <PrivyProvider
      appId={publicEnv.privyAppId}
      config={{
        loginMethods: ["google", "email", "wallet"],
        embeddedWallets: {
          ethereum: { createOnLogin: "users-without-wallets" },
          showWalletUIs: false,
        },
        defaultChain: gameChain,
        supportedChains: [gameChain],
      }}
    >
      <QueryClientProvider client={queryClient}>
        <WagmiProvider config={wagmiConfig} setActiveWalletForWagmi={activeWalletFor}>
          <GameZamaProvider wagmiConfig={wagmiConfig}>
            <SessionKeeper />
            {children}
            <GameToaster />
          </GameZamaProvider>
        </WagmiProvider>
      </QueryClientProvider>
    </PrivyProvider>
  );
}
