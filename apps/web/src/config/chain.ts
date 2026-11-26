import { sepoliaDeployment } from "@bluff/contracts";
import { createPublicClient, fallback, http } from "viem";
import { sepolia } from "viem/chains";
import { publicEnv } from "./env";

const PUBLIC_SEPOLIA_RPC = "https://ethereum-sepolia-rpc.publicnode.com";
const LOG_SEARCH_RPC = "https://sepolia.gateway.tenderly.co";

export const gameChain = sepolia;

export const contracts = sepoliaDeployment;

export const gameTransport = fallback(
  [
    http(publicEnv.sepoliaRpcUrl, { retryCount: 0, timeout: 10_000 }),
    http(PUBLIC_SEPOLIA_RPC, { retryCount: 0, timeout: 10_000 }),
  ],
  { rank: false, retryCount: 1 }
);

export const gameClient = createPublicClient({ chain: gameChain, transport: gameTransport });

export const historyClient = createPublicClient({
  chain: gameChain,
  transport: http(PUBLIC_SEPOLIA_RPC, { retryCount: 2, timeout: 10_000 }),
});

export const bluffDeployBlock = 12_112_051n;

export const logsClient = createPublicClient({
  chain: gameChain,
  transport: http(LOG_SEARCH_RPC, { retryCount: 2, timeout: 15_000 }),
});

export function publicRecordOfDollars(account: `0x${string}`): string {
  return `${gameChain.blockExplorers.default.url}/token/${contracts.dollars}?a=${account}`;
}
