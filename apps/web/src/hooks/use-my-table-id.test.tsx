import { QueryClientProvider, useQuery } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { createQueryClient } from "@/lib/query-client";
import { useMyTableId } from "./use-my-table-id";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ADA = "0x0000000000000000000000000000000000001a2b";
const KOLA = "0x0000000000000000000000000000000000003c4d";
let account = ADA;
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: account } } }),
}));

const seats: Record<string, Promise<bigint>> = {
  [ADA]: Promise.resolve(7n),
  [KOLA]: new Promise<bigint>(() => undefined),
};
vi.mock("wagmi", () => ({
  useReadContract: ({
    functionName,
    args,
    query,
  }: {
    functionName: string;
    args?: readonly [string];
    query: { enabled: boolean };
  }) =>
    useQuery({
      ...query,
      queryKey: ["readContract", { functionName, args }],
      queryFn: () => (args ? seats[args[0]] : undefined) ?? Promise.reject(new Error("unknown")),
    }),
}));

describe("useMyTableId", () => {
  it("never shows the last account's table as the new account's while its own read loads", async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const { result, rerender } = renderHook(() => useMyTableId(), { wrapper });
    await waitFor(() => expect(result.current).toEqual({ status: "ready", id: 7n }));
    account = KOLA;
    rerender();
    expect(result.current).toEqual({ status: "loading" });
  });
});
