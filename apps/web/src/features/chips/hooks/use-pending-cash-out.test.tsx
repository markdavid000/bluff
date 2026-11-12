import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type * as Viem from "viem";
import type { Hex } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberCashOut, rememberedCashOuts } from "../lib/pending-cash-outs";
import { usePendingCashOut } from "./use-pending-cash-out";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";
const NOBODY = "0x0000000000000000000000000000000000000000";
const FINISHED: Hex = `0x${"1".repeat(64)}`;
const OPEN_HERE: Hex = `0x${"2".repeat(64)}`;
const OPEN_ELSEWHERE: Hex = `0x${"3".repeat(64)}`;

const requesters = new Map<Hex, string>();
let recent: Hex[] = [];
const getLogs = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ACCOUNT } } }),
}));
vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof Viem>()),
  createPublicClient: () => ({
    getBlockNumber: async () => 10_000_000n,
    getLogs: (request: unknown) => getLogs(request),
    readContract: async ({ args: [id] }: { args: [Hex] }) => requesters.get(id) ?? NOBODY,
  }),
}));

function render() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => usePendingCashOut(), { wrapper });
}

beforeEach(() => {
  requesters.clear();
  recent = [];
  getLogs.mockImplementation(async () =>
    recent.map((id) => ({ args: { receiver: ACCOUNT, unwrapRequestId: id } }))
  );
});

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("usePendingCashOut", () => {
  it("finds nothing when every cash out finished, and forgets the saved ones", async () => {
    rememberCashOut(ACCOUNT, FINISHED);
    const { result } = render();
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toBeNull();
    expect(rememberedCashOuts(ACCOUNT)).toEqual([]);
  });

  it("finds an unfinished cash out saved on this device", async () => {
    rememberCashOut(ACCOUNT, FINISHED);
    rememberCashOut(ACCOUNT, OPEN_HERE);
    requesters.set(OPEN_HERE, ACCOUNT);
    const { result } = render();
    await waitFor(() => expect(result.current.data).toBe(OPEN_HERE));
  });

  it("finds an unfinished cash out started on another device, looking back only recent blocks", async () => {
    recent = [FINISHED, OPEN_ELSEWHERE];
    requesters.set(OPEN_ELSEWHERE, ACCOUNT);
    const { result } = render();
    await waitFor(() => expect(result.current.data).toBe(OPEN_ELSEWHERE));
    expect(getLogs).toHaveBeenCalledWith(
      expect.objectContaining({
        args: { receiver: ACCOUNT },
        fromBlock: 10_000_000n - 9_000n,
        toBlock: 10_000_000n,
      })
    );
  });

  it("reports a failed lookup instead of claiming nothing is pending", async () => {
    getLogs.mockRejectedValue(new Error("pruned history unavailable"));
    const { result } = render();
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.data).toBeUndefined();
  });
});
