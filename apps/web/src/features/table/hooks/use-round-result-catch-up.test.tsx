import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type * as Chain from "@/config/chain";
import { useRoundResultCatchUp } from "./use-round-result-catch-up";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const LOSER = "0x0000000000000000000000000000000000003c4d";
const getContractEvents = vi.fn();
vi.mock("@/config/chain", async (importOriginal) => ({
  ...(await importOriginal<typeof Chain>()),
  gameClient: { getContractEvents: (request: unknown) => getContractEvents(request) },
}));

function settled(round: number) {
  return {
    args: { id: 12n, round, face: 4, quantity: 3, count: 2, loser: LOSER, revealedFaces: [4, 1] },
  };
}

function render(props: { round: number; fromBlock: bigint; wanted: boolean }) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useRoundResultCatchUp({ id: 12n, ...props }), { wrapper }).result;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe("useRoundResultCatchUp", () => {
  it("reads the round's result from the chain itself, from the block of the call", async () => {
    getContractEvents.mockResolvedValue([settled(2), settled(3)]);
    const result = render({ round: 3, fromBlock: 500n, wanted: true });
    await waitFor(() =>
      expect(result.current).toEqual({
        round: 3,
        face: 4,
        quantity: 3,
        count: 2,
        loser: LOSER,
        faces: [4, 1],
      })
    );
    expect(getContractEvents).toHaveBeenCalledWith(
      expect.objectContaining({ eventName: "RoundSettled", args: { id: 12n }, fromBlock: 500n })
    );
  });

  it("hands nothing over until that round has settled", async () => {
    getContractEvents.mockResolvedValue([settled(2)]);
    const result = render({ round: 3, fromBlock: 500n, wanted: true });
    await waitFor(() => expect(getContractEvents).toHaveBeenCalled());
    expect(result.current).toBeNull();
  });

  it("asks nothing when no reveal is waiting", () => {
    render({ round: 3, fromBlock: 500n, wanted: false });
    expect(getContractEvents).not.toHaveBeenCalled();
  });
});
