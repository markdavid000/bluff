import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type * as Chain from "@/config/chain";
import { useGamesInPlay } from "./use-games-in-play";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ME } } }),
}));

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const getLogs = vi.fn();
const getBlockNumber = vi.fn();
const multicall = vi.fn();
const readContract = vi.fn();
vi.mock("@/config/chain", async (importOriginal) => ({
  ...(await importOriginal<typeof Chain>()),
  historyClient: {
    getLogs: (request: unknown) => getLogs(request),
    getBlockNumber: () => getBlockNumber(),
  },
  gameClient: {
    multicall: (request: unknown) => multicall(request),
    readContract: (request: unknown) => readContract(request),
  },
}));

type TableRead = (id: bigint) => unknown;
function answerTables(read: TableRead) {
  multicall.mockImplementation(async ({ contracts }: { contracts: { args: [bigint] }[] }) =>
    contracts.map(({ args: [id] }) => read(id))
  );
}

const PLAYING = 3;

function view(id: bigint, status = PLAYING) {
  return {
    id,
    host: ADA,
    status,
    isPrivate: false,
    seatCount: 2,
    playerCount: 2,
    dicePerPlayer: 4,
    diceInPlay: 8,
    buyIn: 0n,
    createdAt: 0n,
    startedAt: 1n,
    deadline: 0n,
    round: 1,
    turn: 0,
    roundStarter: 0,
    bidQuantity: 0,
    bidFace: 0,
    bidder: 0,
    caller: 0,
  };
}

function seats(...players: string[]) {
  return players.map((player) => ({
    player,
    ready: true,
    isActive: true,
    dice: 4,
    missedTurns: 0,
  }));
}

function render(watching = false) {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  const hook = renderHook(({ open }) => useGamesInPlay(open), {
    wrapper,
    initialProps: { open: watching },
  });
  const refreshEvery = () =>
    queryClient.getQueryCache().find({ queryKey: ["lobby", "games-in-play"] })?.observers[0]
      ?.options.refetchInterval;
  return { result: hook.result, rerender: hook.rerender, refreshEvery };
}

beforeEach(() => {
  getBlockNumber.mockResolvedValue(1_000n);
  getLogs.mockResolvedValue([
    { eventName: "GameStarted", args: { id: 7n } },
    { eventName: "GameStarted", args: { id: 9n } },
  ]);
  answerTables((id) => [view(id), seats(ADA, "0x0000000000000000000000000000000000005e6f")]);
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("useGamesInPlay", () => {
  it("finds the games that started in the last two hours, newest first", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.games.status).toBe("ready"));
    const games = result.current.games;
    expect(games.status === "ready" && games.games.map((game) => game.id)).toEqual([9n, 7n]);
    expect(getLogs).toHaveBeenCalledWith(
      expect.objectContaining({ fromBlock: 400n, toBlock: 1_000n })
    );
  });

  it("reads every game's table in one batched request", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.games.status).toBe("ready"));
    expect(multicall).toHaveBeenCalledOnce();
    expect(multicall).toHaveBeenCalledWith(
      expect.objectContaining({
        allowFailure: false,
        contracts: [
          expect.objectContaining({ functionName: "getTable", args: [9n] }),
          expect.objectContaining({ functionName: "getTable", args: [7n] }),
        ],
      })
    );
    expect(readContract).not.toHaveBeenCalled();
  });

  it("refreshes slowly for the count, and quickly only while the list is open", async () => {
    const { result, rerender, refreshEvery } = render();
    await waitFor(() => expect(result.current.games.status).toBe("ready"));
    expect(refreshEvery()).toBe(60_000);
    rerender({ open: true });
    expect(refreshEvery()).toBe(10_000);
    rerender({ open: false });
    expect(refreshEvery()).toBe(60_000);
  });

  it("looks again straight away when asked", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.games.status).toBe("ready"));
    expect(getLogs).toHaveBeenCalledOnce();
    result.current.refresh();
    await waitFor(() => expect(getLogs).toHaveBeenCalledTimes(2));
  });

  it("leaves out games the player is in", async () => {
    answerTables((id) => [view(id), seats(ADA, ME)]);
    const { result } = render();
    await waitFor(() => expect(result.current.games.status).toBe("ready"));
    const games = result.current.games;
    expect(games.status === "ready" && games.games).toEqual([]);
  });

  it("offers to try again when the games can't be read", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    getLogs.mockRejectedValue(new Error("busy"));
    const { result } = render();
    await waitFor(() => expect(result.current.games.status).toBe("failed"));
  });
});
