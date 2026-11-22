function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`${name} is not set. See apps/web/.env.example.`);
  return value;
}

export const publicEnv = {
  privyAppId: required("NEXT_PUBLIC_PRIVY_APP_ID", process.env.NEXT_PUBLIC_PRIVY_APP_ID),
  sepoliaRpcUrl: required("NEXT_PUBLIC_SEPOLIA_RPC_URL", process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL),
  botUrl: required("NEXT_PUBLIC_BOT_URL", process.env.NEXT_PUBLIC_BOT_URL),
} as const;
