import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Chain from "@/config/chain";
import { useGameHistory, useRoundHistory } from "./use-round-history";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ADA = "0x0000000000000000000000000000000000003c4d";
const getLogs = vi.fn();
const getBlockNumber = vi.fn();
vi.mock("@/config/chain", async (importOriginal) => ({
  ...(await importOriginal<typeof Chain>()),
  gameClient: {
    getLogs: (request: unknown) => getLogs(request),
    getBlockNumber: () => getBlockNumber(),
  },
}));

function render(enabled = true) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRoundHistory({ id: 12n, round: 1, bidKey: "1-0-0", enabled }), {
    wrapper,
  }).result;
}

beforeEach(() => {
  getBlockNumber.mockResolvedValue(1_000n);
  getLogs.mockResolvedValue([
    { eventName: "RoundStarted", args: { id: 12n, round: 1 } },
    { eventName: "BidPlaced", args: { id: 99n, round: 1, player: ADA, quantity: 5, face: 6 } },
    { eventName: "BidPlaced", args: { id: 12n, round: 1, player: ADA, quantity: 2, face: 4 } },
  ]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useRoundHistory", () => {
  it("reads this table's rounds from recent blocks, ignoring other tables", async () => {
    const result = render();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    expect(result.current).toMatchObject({
      status: "ready",
      rounds: [{ round: 1, bids: [{ player: ADA, quantity: 2, face: 4 }], end: null }],
    });
    expect(getLogs).toHaveBeenCalledWith(expect.objectContaining({ fromBlock: 600n }));
  });

  it("offers to try again when the rounds can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    getLogs.mockRejectedValue(new Error("busy"));
    const result = render();
    await waitFor(() => expect(result.current.status).toBe("failed"));
  });

  it("reads nothing when the history isn't wanted", () => {
    expect(render(false).current.status).toBe("loading");
    expect(getLogs).not.toHaveBeenCalled();
  });

  describe("useGameHistory", () => {
    it("lists the player's own bid at once, while it's still on its way", async () => {
      const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
      const wrapper = ({ children }: { children: ReactNode }) => (
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      );
      getLogs.mockResolvedValue([{ eventName: "RoundStarted", args: { id: 12n, round: 1 } }]);
      const table = {
        id: 12n,
        round: 1,
        status: "playing",
        turn: 0,
        bid: null,
        seats: [],
      } as unknown as Parameters<typeof useGameHistory>[0];
      const { result } = renderHook(
        () => useGameHistory(table, true, { bid: { quantity: 2, face: 5 }, bidder: ADA }),
        { wrapper }
      );
      await waitFor(() => expect(result.current.status).toBe("ready"));
      expect(result.current).toMatchObject({
        rounds: [{ round: 1, bids: [{ player: ADA, quantity: 2, face: 5 }] }],
      });
    });
  });
});
