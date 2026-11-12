import { sepoliaDeployment } from "@bluff/contracts";
import { fallback, http } from "viem";
import { sepolia } from "viem/chains";
import { publicEnv } from "./env";

const PUBLIC_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";

export const gameChain = sepolia;

export const contracts = sepoliaDeployment;

export const gameTransport = fallback(
  [
    http(publicEnv.sepoliaRpcUrl, { retryCount: 2, timeout: 10_000 }),
    http(PUBLIC_SEPOLIA_RPC, { retryCount: 2, timeout: 10_000 }),
  ],
  { rank: false }
);
