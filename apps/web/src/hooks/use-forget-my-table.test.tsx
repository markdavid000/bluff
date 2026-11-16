import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import { useForgetMyTable } from "./use-my-table-id";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ME } } }),
}));

const seatOf = (player: string) => ["readContract", { functionName: "tableOf", args: [player] }];

describe("useForgetMyTable", () => {
  it("clears the player's remembered seat at the table they just left, and nothing else", () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(seatOf(ME), 12n);
    queryClient.setQueryData(seatOf(ADA), 12n);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const forget = renderHook(() => useForgetMyTable(), { wrapper }).result.current;

    forget(99n);
    expect(queryClient.getQueryData(seatOf(ME))).toBe(12n);

    forget(12n);
    expect(queryClient.getQueryData(seatOf(ME))).toBe(0n);
    expect(queryClient.getQueryData(seatOf(ADA))).toBe(12n);
  });
});
