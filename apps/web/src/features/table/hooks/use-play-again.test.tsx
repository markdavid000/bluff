import type { Address } from "viem";
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
const callComputer = vi.fn();
vi.mock("@/hooks/use-computer-call", () => ({
  callComputer: (id: bigint) => callComputer(id),
}));
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

const COMPUTER: Address = "0xA801FA5F654088a288c4B4eA27407FA10c17e12F";

function render(buyIn = 0n, isPrivate = false, watching = false, opponent: Address = ADA) {
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
          { player: opponent, name: "Ada #3C4D", isMe: false },
        ],
        watching,
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

  it("calls the computer back to the new table after a game against it", async () => {
    vi.useRealTimers();
    const { result } = render(0n, false, false, COMPUTER);
    act(() => result.current.playAgain());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/table/30"));
    expect(callComputer).toHaveBeenCalledWith(30n);
  });

  it("doesn't call the computer after a game between people", async () => {
    vi.useRealTimers();
    const { result } = render();
    act(() => result.current.playAgain());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/table/30"));
    expect(callComputer).not.toHaveBeenCalled();
  });

  it("says how many chips it takes instead of paying for a seat it can't afford", () => {
    balance = { status: "ready", amount: 5n * ONE_CHIP };
    const { result } = render(10n * ONE_CHIP);
    act(() => result.current.playAgain());
    expect(takeSeat).not.toHaveBeenCalled();
    expect(shown.map((notice) => notice.title)).toEqual([tableCopy.notEnough("10")]);
  });

  it("waits quietly while the player's chips are still loading, rather than asking to see them", () => {
    balance = { status: "loading" };
    const { result } = render(10n * ONE_CHIP);
    act(() => result.current.playAgain());
    expect(takeSeat).not.toHaveBeenCalled();
    expect(shown).toEqual([]);
    expect(result.current.waitingForChips).toBe(true);
  });

  it("still asks to see the chips when they are hidden", () => {
    balance = { status: "hidden", reveal: vi.fn(), revealing: false, asksWallet: false };
    const { result } = render(10n * ONE_CHIP);
    expect(result.current.waitingForChips).toBe(false);
    act(() => result.current.playAgain());
    expect(shown.map((notice) => notice.title)).toEqual([tableCopy.showChipsFirst]);
  });

  it("never looks for new tables for someone who only watched", () => {
    reads = { tableOf: [20n], getTable: [waitingTable(20n, ADA)] };
    const { result } = render(0n, false, true);
    expect(asked.length).toBeGreaterThan(0);
    expect(asked.every((call) => !call.enabled)).toBe(true);
    expect(result.current.offer).toBeNull();
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
