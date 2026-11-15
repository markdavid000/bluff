import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import { createElement, type ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import { useClaimChips } from "./use-claim-chips";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const sendMove = vi.fn();
const refetch = vi.fn();
const invalidateBalanceQueries = vi.fn();
let nextClaimAt: bigint | undefined;
let readFailed = false;

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: "0x1" } } }),
}));
vi.mock("wagmi", () => ({
  useReadContract: () => ({ data: nextClaimAt, isError: readFailed, refetch }),
}));
vi.mock("@zama-fhe/sdk/query", () => ({
  invalidateBalanceQueries: (...args: unknown[]) => invalidateBalanceQueries(...args),
}));
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));

const NOW = new Date("2026-11-12T10:00:00Z").getTime();

function render() {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) =>
    createElement(QueryClientProvider, { client: queryClient }, children);
  return renderHook(() => useClaimChips(), { wrapper });
}

beforeEach(() => {
  vi.useFakeTimers({ shouldAdvanceTime: true });
  vi.setSystemTime(NOW);
  sendMove.mockResolvedValue({ status: "success" });
});

afterEach(() => {
  readFailed = false;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useClaimChips", () => {
  it("is loading until the next claim time is known", () => {
    nextClaimAt = undefined;
    expect(render().result.current.status).toBe("loading");
  });

  it("offers to try again when the next claim time can't be read", () => {
    nextClaimAt = undefined;
    readFailed = true;
    const claim = render().result.current;
    if (claim.status !== "failed") throw new Error("Expected a failure.");
    claim.retry();
    expect(refetch).toHaveBeenCalledOnce();
  });

  it("counts down to the next claim", () => {
    nextClaimAt = BigInt((NOW + 3 * 3_600_000 + 12 * 60_000) / 1000);
    const { result } = render();
    expect(result.current).toEqual({ status: "waiting", remainingMs: (3 * 3600 + 12 * 60) * 1000 });
  });

  it("offers the claim once the time has passed, and refreshes the balance after", async () => {
    nextClaimAt = BigInt(NOW / 1000 - 1);
    const { result } = render();
    const ready = result.current;
    if (ready.status !== "ready") throw new Error(`Expected a claim, got ${ready.status}.`);
    act(() => ready.claim());

    await waitFor(() => expect(refetch).toHaveBeenCalledOnce());
    expect(sendMove).toHaveBeenCalledWith(
      expect.objectContaining({ address: contracts.faucet, functionName: "claim", args: [""] }),
      expect.any(Function)
    );
    expect(invalidateBalanceQueries).toHaveBeenCalledWith(expect.anything(), contracts.chips);
  });

  it("offers the claim to a player who never claimed", () => {
    nextClaimAt = 0n;
    expect(render().result.current.status).toBe("ready");
  });
});
