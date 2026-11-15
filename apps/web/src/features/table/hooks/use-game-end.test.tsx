import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type * as Viem from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useGameEnd } from "./use-game-end";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const A = "0x0000000000000000000000000000000000001a2b";
const B = "0x0000000000000000000000000000000000003c4d";
const getLogs = vi.fn();
const getBlockNumber = vi.fn();

vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof Viem>()),
  createPublicClient: () => ({
    getBlockNumber: () => getBlockNumber(),
    getLogs: (request: unknown) => getLogs(request),
  }),
}));

function render(
  finished = true,
  live: { reason: "clock"; winners: string[] } | null = null,
  seenAt = 9_999_000n
) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useGameEnd({ id: 12n, finished, live, seenAt }), { wrapper });
}

beforeEach(() => {
  getBlockNumber.mockResolvedValue(10_000_000n);
  getLogs.mockResolvedValue([{ args: { id: 12n, reason: 1, winners: [A, B] } }]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useGameEnd", () => {
  it("reads who won from the table's end, in recent history", async () => {
    const { result } = render();
    await waitFor(() =>
      expect(result.current).toEqual({ status: "ready", reason: "clock", winners: [A, B] })
    );
    expect(getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ args: { id: 12n }, fromBlock: 10_000_000n - 9_000n })
    );
  });

  it("uses the winners the table just announced, without reading history", () => {
    expect(render(true, { reason: "clock", winners: [A] }).result.current).toEqual({
      status: "ready",
      reason: "clock",
      winners: [A],
    });
    expect(getLogs).not.toHaveBeenCalled();
  });

  it("waits for history to reach the end of the game before deciding anything", async () => {
    getBlockNumber.mockResolvedValueOnce(9_998_000n).mockResolvedValue(10_000_000n);
    const { result } = render();
    expect(result.current.status).toBe("loading");
    await waitFor(
      () => expect(result.current).toEqual({ status: "ready", reason: "clock", winners: [A, B] }),
      { timeout: 4_000 }
    );
    expect(getLogs).toHaveBeenCalledOnce();
  });

  it("asks nothing until the game is over", () => {
    expect(render(false).result.current.status).toBe("loading");
    expect(getLogs).not.toHaveBeenCalled();
  });

  it("says when the end is too far back to read, instead of guessing", async () => {
    getLogs.mockResolvedValue([]);
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe("unknown"));
  });

  it("offers to try again when history can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    getLogs.mockRejectedValue(new Error("busy"));
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe("failed"));
  });
});
