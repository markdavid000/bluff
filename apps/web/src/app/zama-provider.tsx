"use client";

import type { Config } from "wagmi";
import { ZamaProvider } from "@zama-fhe/react-sdk";
import { createConfig } from "@zama-fhe/react-sdk/wagmi";
import { sepolia as sepoliaFhe } from "@zama-fhe/sdk/chains";
import { web } from "@zama-fhe/sdk/web";
import { useState, type ReactNode } from "react";
import { publicEnv } from "@/config/env";

export function GameZamaProvider({
  wagmiConfig,
  children,
}: {
  wagmiConfig: Config;
  children: ReactNode;
}) {
  const [config] = useState(() =>
    createConfig({
      chains: [{ ...sepoliaFhe, network: publicEnv.sepoliaRpcUrl }],
      wagmiConfig,
      relayers: { [sepoliaFhe.id]: web() },
      runtime: { singleThread: true },
    })
  );
  return <ZamaProvider config={config}>{children}</ZamaProvider>;
}
