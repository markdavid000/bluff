import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import type * as Viem from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { rememberGames, rememberedGames } from "../lib/remembered-games";
import { useGameHistoryList } from "./use-game-history-list";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const HEAD = 12_150_000n;
const FINISHED = 5;
const WAITING = 1;

interface Fake {
  id: bigint;
  status: number;
  block: bigint;
}

let tables: Fake[] = [];
let logsFail = false;
const getLogs = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ME } } }),
}));
vi.mock("@/hooks/use-player-profiles", () => ({
  usePlayerProfiles: () => ({ status: "ready", pending: false, profileOf: () => undefined }),
}));

function view(table: Fake) {
  return [
    {
      id: table.id,
      host: ME,
      status: table.status,
      isPrivate: false,
      seatCount: 2,
      playerCount: 2,
      buyIn: 0n,
      deadline: 0n,
      dicePerPlayer: 4,
      diceInPlay: 4,
      startedAt: 1_700_000_000n,
      round: 3,
      turn: 0,
      roundStarter: 0,
      bidQuantity: 0,
      bidFace: 0,
      bidder: 0,
      caller: 0,
    },
    [ME, ADA].map((player) => ({
      player,
      ready: true,
      isActive: player === ME,
      dice: player === ME ? 4 : 0,
      missedTurns: 0,
    })),
  ];
}

vi.mock("viem", async (importOriginal) => ({
  ...(await importOriginal<typeof Viem>()),
  createPublicClient: () => ({
    getBlockNumber: async () => HEAD,
    getLogs: (request: unknown) => getLogs(request),
    multicall: async ({ contracts }: { contracts: { args: [bigint] }[] }) =>
      contracts.map(({ args: [id] }) => view(tables.find((table) => table.id === id) as Fake)),
  }),
}));

function render() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(() => useGameHistoryList(), { wrapper });
}

beforeEach(() => {
  tables = [];
  logsFail = false;
  getLogs.mockImplementation(
    async ({
      event,
      fromBlock,
      toBlock,
      args,
    }: {
      event: { name: string };
      fromBlock: bigint;
      toBlock: bigint;
      args: { id?: bigint[] };
    }) => {
      if (logsFail) throw new Error("The log service is down.");
      if (event.name === "PlayerJoined") {
        return tables
          .filter((table) => table.block >= fromBlock && table.block <= toBlock)
          .map((table) => ({ args: { id: table.id, player: ME }, blockNumber: table.block }));
      }
      if (event.name === "GameEnded") {
        return (args.id ?? [])
          .filter(() => fromBlock <= HEAD && toBlock >= HEAD)
          .map((id) => ({ args: { id, reason: 0, winners: [ME] }, blockNumber: HEAD }));
      }
      return [];
    }
  );
});

afterEach(() => {
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("useGameHistoryList", () => {
  it("loads, then lists your started games newest first with their results", async () => {
    tables = [
      { id: 1n, status: FINISHED, block: 12_120_000n },
      { id: 2n, status: WAITING, block: 12_130_000n },
      { id: 3n, status: FINISHED, block: 12_140_000n },
    ];
    const { result } = render();
    expect(result.current.status).toBe("loading");
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") return;
    expect(result.current.games.map((game) => [game.table.id, game.outcome.result])).toEqual([
      [3n, "won"],
      [1n, "won"],
    ]);
    expect(result.current.more).toBe(false);
  });

  it("is empty when you've never played", async () => {
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") return;
    expect(result.current.games).toEqual([]);
  });

  it("says it failed, and tries again when asked", async () => {
    logsFail = true;
    tables = [{ id: 1n, status: FINISHED, block: 12_120_000n }];
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe("failed"));
    logsFail = false;
    act(() => {
      if (result.current.status === "failed") result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe("ready"));
  });

  it("shows twenty at a time, with more on request", async () => {
    tables = Array.from({ length: 25 }, (_, index) => ({
      id: BigInt(index + 1),
      status: FINISHED,
      block: 12_112_100n + BigInt(index),
    }));
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    if (result.current.status !== "ready") return;
    expect(result.current.games).toHaveLength(20);
    expect(result.current.more).toBe(true);
    act(() => {
      if (result.current.status === "ready") result.current.loadMore();
    });
    await waitFor(() =>
      expect(result.current.status === "ready" && result.current.games.length).toBe(25)
    );
    expect(result.current.status === "ready" && result.current.more).toBe(false);
  });

  it("remembers what it found, and next time only searches newer blocks", async () => {
    rememberGames(ME, {
      searchedTo: 12_149_000n,
      joins: [{ id: 1n, block: 12_120_000n }],
      lefts: [],
    });
    tables = [
      { id: 1n, status: FINISHED, block: 12_120_000n },
      { id: 4n, status: FINISHED, block: 12_149_500n },
    ];
    const { result } = render();
    await waitFor(() => expect(result.current.status).toBe("ready"));
    const joinSearches = getLogs.mock.calls
      .map(([request]) => request as { event: { name: string }; fromBlock: bigint })
      .filter((request) => request.event.name === "PlayerJoined");
    expect(joinSearches.map((request) => request.fromBlock)).toEqual([12_149_001n]);
    expect(
      result.current.status === "ready" && result.current.games.map((game) => game.table.id)
    ).toEqual([4n, 1n]);
    expect(rememberedGames(ME)?.searchedTo).toBe(HEAD);
  });
});
