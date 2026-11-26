import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";
import type * as WagmiQuery from "wagmi/query";
import { hashFn } from "wagmi/query";
import { createQueryClient } from "@/lib/query-client";
import {
  arriveAtTable,
  headToTable,
  stopHeadingTo,
  takeSeatWhileHere,
  useGoToTable,
  useHeadingTo,
  useTakingSeat,
} from "./use-go-to-table";

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

describe("takeSeatWhileHere", () => {
  it("holds the player where they are while their seat lands, then heads for its table", async () => {
    let land: (id: bigint) => void = () => undefined;
    const taking = renderHook(() => useTakingSeat());
    const heading = renderHook(() => useHeadingTo());
    let seated: Promise<bigint> = Promise.resolve(0n);
    act(() => {
      seated = takeSeatWhileHere(
        () => new Promise<bigint>((resolve) => (land = resolve)),
        () => true
      );
    });
    expect(taking.result.current).toBe(true);
    await act(async () => {
      land(44n);
      await seated;
    });
    expect(taking.result.current).toBe(false);
    expect(heading.result.current).toBe(44n);
    act(() => arriveAtTable());
  });

  it("heads nowhere once the screen that asked for the seat has gone", async () => {
    const heading = renderHook(() => useHeadingTo());
    await act(async () => {
      await takeSeatWhileHere(
        () => Promise.resolve(45n),
        () => false
      );
    });
    expect(heading.result.current).toBeNull();
  });

  it("lets go of the player when the seat fails, heading nowhere", async () => {
    const taking = renderHook(() => useTakingSeat());
    const heading = renderHook(() => useHeadingTo());
    await act(async () => {
      await expect(
        takeSeatWhileHere(
          () => Promise.reject(new Error("no")),
          () => true
        )
      ).rejects.toThrow("no");
    });
    expect(taking.result.current).toBe(false);
    expect(heading.result.current).toBeNull();
  });
});

describe("stopHeadingTo", () => {
  it("lets go of the table it names, and leaves any other alone", () => {
    const heading = renderHook(() => useHeadingTo());
    act(() => headToTable(50n));
    act(() => stopHeadingTo(51n));
    expect(heading.result.current).toBe(50n);
    act(() => stopHeadingTo(50n));
    expect(heading.result.current).toBeNull();
  });
});

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

  it("notes where it's heading, so nothing else moves the player meanwhile, until they arrive", async () => {
    const queryClient = createQueryClient();
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    const heading = renderHook(() => useHeadingTo());
    const goTo = renderHook(() => useGoToTable(), { wrapper }).result.current;
    await act(() => goTo(31n));
    expect(heading.result.current).toBe(31n);
    act(() => arriveAtTable());
    expect(heading.result.current).toBeNull();
  });
});
