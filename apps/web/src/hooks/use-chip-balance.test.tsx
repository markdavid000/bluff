import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { useChipBalance } from "./use-chip-balance";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ADA = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
let account = ADA;
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: account } } }),
}));
vi.mock("./use-permit", () => ({
  usePermit: () => ({ status: "granted", grant: vi.fn(), granting: false, asksWallet: false }),
}));

const balances: Record<string, Promise<bigint>> = {
  [ADA]: Promise.resolve(250n),
  [KOLA]: new Promise<bigint>(() => undefined),
};
vi.mock("@zama-fhe/react-sdk", () => ({
  useConfidentialBalance: (
    { account: owner }: { account?: string },
    options: { enabled: boolean }
  ) =>
    useQuery({
      ...options,
      queryKey: ["confidentialBalance", owner],
      queryFn: () => (owner ? balances[owner] : undefined) ?? Promise.reject(new Error("unknown")),
    }),
}));

describe("useChipBalance", () => {
  it("never shows the last account's chips as the new account's while its own balance loads", async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useChipBalance({ working: "Working" }), {
      wrapper,
    });
    await waitFor(() => expect(result.current).toEqual({ status: "ready", amount: 250n }));
    account = KOLA;
    rerender();
    expect(result.current).toEqual({ status: "loading" });
  });
});
