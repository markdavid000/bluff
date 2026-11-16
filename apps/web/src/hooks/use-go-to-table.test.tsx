import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type * as WagmiQuery from "wagmi/query";
import { hashFn } from "wagmi/query";
import { createQueryClient } from "@/lib/query-client";
import { useGoToTable } from "./use-go-to-table";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const steps: string[] = [];
const push = vi.fn((path: string) => steps.push(`open ${path}`));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("wagmi", () => ({ useConfig: () => ({}), useChainId: () => 11155111 }));
const asked: Record<string, unknown>[] = [];
vi.mock("wagmi/query", async (importOriginal) => ({
  hashFn: (await importOriginal<typeof WagmiQuery>()).hashFn,
  readContractQueryOptions: (_config: unknown, options: Record<string, unknown>) => {
    asked.push(options);
    return {
      queryKey: ["readContract", { functionName: options.functionName, args: options.args }],
      queryFn: async () => {
        steps.push("read the table");
        return "table 30";
      },
    };
  },
}));

describe("useGoToTable", () => {
  it("reads the new table into the cache before opening it, so its page has nothing to load", async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const goTo = renderHook(() => useGoToTable(), { wrapper }).result.current;
    await act(() => goTo(30n));
    expect(steps).toEqual(["read the table", "open /table/30"]);
    expect(asked[0]).toMatchObject({ functionName: "getTable", args: [30n], chainId: 11155111 });
    const key = ["readContract", { functionName: "getTable", args: [30n] }];
    expect(queryClient.getQueryCache().find({ queryKey: key, exact: false })?.state.data).toBe(
      "table 30"
    );
    expect(queryClient.getQueryCache().find({ queryKey: key })?.queryHash).toBe(hashFn(key));
  });
});
