import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ONE_CHIP } from "@/lib/chips";
import { type Notice, onNotice } from "@/lib/notify";
import { tableCopy } from "../copy";
import { usePlayAgain } from "./use-play-again";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x0000000000000000000000000000000000001a2b";
const ADA = "0x0000000000000000000000000000000000003c4d";
const NOW = 1_700_000_000_000;

const takeSeat = vi.fn();
const push = vi.fn();
let balance: Record<string, unknown> = { status: "ready", amount: 100n * ONE_CHIP };
let reads: Record<string, unknown[]> = {};
const asked: { functionName: string; enabled: boolean }[] = [];

vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
vi.mock("@/hooks/use-take-seat", () => ({ useTakeSeat: () => takeSeat }));
let arrive: () => void = () => undefined;
let holdArrival = false;
vi.mock("@/hooks/use-go-to-table", () => ({
  useGoToTable: () => (id: bigint) =>
    new Promise<void>((resolve) => {
      arrive = () => {
        push(`/table/${id}`);
        resolve();
      };
      if (!holdArrival) arrive();
    }),
}));
vi.mock("@/hooks/use-chip-balance", () => ({ useChipBalance: () => balance }));
vi.mock("@zama-fhe/sdk/query", () => ({ invalidateBalanceQueries: vi.fn() }));
vi.mock("wagmi", () => ({
  useReadContracts: ({
    contracts,
    query,
  }: {
    contracts: { functionName: string }[];
    query: { enabled: boolean };
  }) => {
    const functionName = contracts[0]?.functionName ?? "none";
    asked.push({ functionName, enabled: query.enabled });
    const data = reads[functionName];
    return { data: query.enabled ? data : undefined, isPlaceholderData: false };
  },
}));

function waitingTable(id: bigint, host: string, buyIn = 0n) {
  return [
    {
      id,
      host,
      status: 1,
      isPrivate: false,
      seatCount: 2,
      buyIn,
      createdAt: BigInt(NOW / 1000 + 60),
      deadline: BigInt(NOW / 1000 + 600),
      dicePerPlayer: 4,
      diceInPlay: 0,
      startedAt: 0n,
      round: 0,
      turn: 0,
      roundStarter: 0,
      bidQuantity: 0,
      bidFace: 0,
      bidder: 0,
      caller: 0,
      playerCount: 1,
    },
    [{ player: host, ready: false, paid: false, isActive: true, dice: 0, missedTurns: 0 }],
  ];
}

function render(buyIn = 0n, isPrivate = false) {
  const queryClient = new QueryClient();
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return renderHook(
    () =>
      usePlayAgain({
        last: { id: 12n, seatCount: 2, buyIn, isPrivate, startedAt: NOW - 300_000 },
        players: [
          { player: ME, name: "Me #1A2B", isMe: true },
          { player: ADA, name: "Ada #3C4D", isMe: false },
        ],
      }),
    { wrapper }
  );
}

let shown: Notice[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date", "setInterval", "clearInterval"] });
  vi.setSystemTime(NOW);
  reads = { tableOf: [12n], getTable: [] };
  balance = { status: "ready", amount: 100n * ONE_CHIP };
  takeSeat.mockResolvedValue(30n);
  shown = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice);
  });
});

afterEach(() => {
  stop();
  asked.length = 0;
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("usePlayAgain", () => {
  it("sets up a new table with the last game's settings and opens it", async () => {
    vi.useRealTimers();
    const { result } = render(10n * ONE_CHIP, true);
    act(() => result.current.playAgain());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/table/30"));
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "create", seatCount: 2, buyIn: 10n * ONE_CHIP, isPrivate: true },
      expect.any(Function)
    );
  });

  it("says how many chips it takes instead of paying for a seat it can't afford", () => {
    balance = { status: "ready", amount: 5n * ONE_CHIP };
    const { result } = render(10n * ONE_CHIP);
    act(() => result.current.playAgain());
    expect(takeSeat).not.toHaveBeenCalled();
    expect(shown.map((notice) => notice.title)).toEqual([tableCopy.notEnough("10")]);
  });

  it("offers the new table a player from the last game set up, and joins it", async () => {
    reads = { tableOf: [20n], getTable: [waitingTable(20n, ADA)] };
    const { result } = render();
    expect(result.current.offer).toEqual({
      id: 20n,
      hostName: "Ada #3C4D",
      buyIn: 0n,
      isPrivate: false,
    });
    vi.useRealTimers();
    act(() => result.current.joinOffer());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/table/30"));
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "join", tableId: 20n, buyIn: 0n },
      expect.any(Function)
    );
  });

  it("only asks about the other players, never the player themselves", () => {
    render();
    expect(asked.find((call) => call.functionName === "tableOf")?.enabled).toBe(true);
  });

  it("stops looking for a new table after 10 minutes", () => {
    const { rerender } = render();
    act(() => {
      vi.advanceTimersByTime(10 * 60 * 1000 + 1000);
    });
    asked.length = 0;
    rerender();
    expect(asked.find((call) => call.functionName === "tableOf")?.enabled).toBe(false);
  });

  it("stays on setting up the table until the new table opens", async () => {
    vi.useRealTimers();
    holdArrival = true;
    const { result } = render();
    act(() => result.current.playAgain());
    await waitFor(() => expect(takeSeat).toHaveBeenCalled());
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(result.current.playing).toBe(true);
    expect(push).not.toHaveBeenCalled();
    act(() => arrive());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/table/30"));
    holdArrival = false;
  });
});
