import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import { ONE_CHIP } from "@/lib/chips";
import { type Notice, onNotice } from "@/lib/notify";
import { lobbyCopy } from "../copy";
import type { LobbyTable } from "../lib/tables";
import { QUICK_PLAY_SEATS, pickTableToJoin, useSitDown } from "./use-sit-down";

vi.mock("@/config/env", () => ({
  publicEnv: {
    privyAppId: "test-app",
    sepoliaRpcUrl: "http://127.0.0.1:8545",
    botUrl: "https://bot.example",
  },
}));

const requestComputer = vi.fn();
vi.mock("../lib/computer-seat", () => ({
  requestComputer: (...args: unknown[]) => requestComputer(...args),
}));

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";
const takeSeat = vi.fn();
const push = vi.fn();
const router = { push };
const invalidateBalanceQueries = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/hooks/use-take-seat", () => ({ useTakeSeat: () => takeSeat }));
let arrive: () => void = () => undefined;
const headingTo = vi.fn();
const headToTable = vi.fn();
vi.mock("@/hooks/use-go-to-table", () => ({
  headToTable: (id: bigint) => headToTable(id),
  useGoToTable: () => (id: bigint) =>
    new Promise<void>((resolve) => {
      headingTo(id);
      arrive = () => {
        push(`/table/${id}`);
        resolve();
      };
      if (!holdArrival) arrive();
    }),
}));
let holdArrival = false;
vi.mock("@zama-fhe/sdk/query", () => ({
  invalidateBalanceQueries: (...args: unknown[]) => invalidateBalanceQueries(...args),
}));

function table(id: bigint, players: number, seats: number, buyIn: bigint): LobbyTable {
  return {
    id,
    host: ACCOUNT,
    waiting: true,
    isPrivate: false,
    seatCount: seats,
    playerCount: players,
    buyIn,
    createdAt: Number(id) * 1000,
    closesAt: 0,
  };
}

function render() {
  const queryClient = new QueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return renderHook(() => useSitDown(), { wrapper: Wrapper });
}

let notices: Notice[] = [];
let stopListening: () => void = () => undefined;

beforeEach(() => {
  notices = [];
  stopListening = onNotice((event) => {
    if (event.type === "show") notices.push(event.notice);
  });
  requestComputer.mockResolvedValue({ kind: "seated" });
  takeSeat.mockResolvedValue(12n);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  stopListening();
  vi.restoreAllMocks();
  vi.clearAllMocks();
});

describe("pickTableToJoin", () => {
  it("joins the fullest open table with the same chips to play", () => {
    const tables = [
      table(1n, 1, 4, 0n),
      table(2n, 2, 3, 0n),
      table(3n, 1, 2, 10n * ONE_CHIP),
      table(4n, 1, 2, 0n),
    ];
    expect(pickTableToJoin(tables, 0n)?.id).toBe(2n);
    expect(pickTableToJoin(tables, 10n * ONE_CHIP)?.id).toBe(3n);
  });

  it("breaks a tie by joining the table that has waited longest, whatever its number", () => {
    const older = { ...table(900n, 1, 2, 0n), createdAt: 1_000 };
    const newer = { ...table(5n, 1, 2, 0n), createdAt: 2_000 };
    expect(pickTableToJoin([newer, older], 0n)?.id).toBe(900n);
  });

  it("finds nothing when no table matches or has a free seat", () => {
    expect(pickTableToJoin([table(1n, 2, 2, 0n), table(2n, 1, 2, 25n * ONE_CHIP)], 0n)).toBeNull();
  });
});

describe("useSitDown", () => {
  it("takes the player to their new table once seated, and refreshes their chips", async () => {
    const { result } = render();
    act(() =>
      result.current.create({
        kind: "create",
        seatCount: 3,
        buyIn: 10n * ONE_CHIP,
        isPrivate: true,
      })
    );
    await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "create", seatCount: 3, buyIn: 10n * ONE_CHIP, isPrivate: true },
      expect.any(Function)
    );
    expect(invalidateBalanceQueries).toHaveBeenCalledWith(expect.anything(), contracts.chips);
  });

  it("plays now by joining the fullest matching table", async () => {
    const { result } = render();
    act(() => result.current.quickPlay(async () => [table(4n, 1, 4, 0n), table(5n, 2, 3, 0n)], 0n));
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "join", tableId: 5n, buyIn: 0n },
      expect.any(Function)
    );
  });

  it("plays now by opening a public table for two when nothing matches", async () => {
    const { result } = render();
    act(() => result.current.quickPlay(async () => [table(4n, 1, 2, 10n * ONE_CHIP)], 0n));
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "create", seatCount: QUICK_PLAY_SEATS, buyIn: 0n, isPrivate: false },
      expect.any(Function)
    );
  });

  it("reads the open tables at the moment of the press, so it never misses one just opened", async () => {
    const latest = vi.fn(async () => [table(9n, 1, 2, 0n)]);
    const { result } = render();
    act(() => result.current.quickPlay(latest, 0n));
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(latest).toHaveBeenCalledOnce();
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "join", tableId: 9n, buyIn: 0n },
      expect.any(Function)
    );
  });

  it("never sets up a new table when the open tables can't be read", async () => {
    const { result } = render();
    act(() =>
      result.current.quickPlay(async () => {
        throw new Error("busy");
      }, 0n)
    );
    await waitFor(() => expect(result.current.working).toBe(false));
    expect(takeSeat).not.toHaveBeenCalled();
  });

  it("stays busy, naming the table it's heading to, until that table opens", async () => {
    holdArrival = true;
    const { result } = render();
    act(() => result.current.join({ kind: "join", tableId: 12n, buyIn: 0n }));
    await waitFor(() => expect(headingTo).toHaveBeenCalledWith(12n));
    expect(result.current.working).toBe(true);
    expect(push).not.toHaveBeenCalled();
    act(() => arrive());
    await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
    holdArrival = false;
  });

  it("keeps Quick play showing it's finding a seat until the table opens", async () => {
    holdArrival = true;
    const { result } = render();
    act(() => result.current.quickPlay(async () => [], 0n));
    await waitFor(() => expect(headingTo).toHaveBeenCalledWith(12n));
    expect(result.current.findingSeat).toBe(true);
    expect(result.current.creating).toBe(false);
    act(() => arrive());
    await waitFor(() => expect(push).toHaveBeenCalled());
    holdArrival = false;
  });

  it("stays in the lobby when the move fails", async () => {
    takeSeat.mockRejectedValue(new Error("The table filled up."));
    const { result } = render();
    act(() => result.current.join({ kind: "join", tableId: 12n, buyIn: 0n }));
    await waitFor(() => expect(result.current.working).toBe(false));
    expect(push).not.toHaveBeenCalled();
  });

  describe("Play the computer", () => {
    it("makes a free public table for two, seats the computer, then opens the table", async () => {
      holdArrival = true;
      const { result } = render();
      act(() => result.current.playComputer());
      await waitFor(() => expect(headingTo).toHaveBeenCalledWith(12n));
      expect(takeSeat).toHaveBeenCalledWith(
        { kind: "create", seatCount: 2, buyIn: 0n, isPrivate: false },
        expect.any(Function)
      );
      expect(requestComputer).toHaveBeenCalledWith(
        expect.objectContaining({ botUrl: "https://bot.example", tableId: 12n })
      );
      expect(result.current.callingComputer).toBe(true);
      expect(result.current.findingSeat).toBe(false);
      expect(result.current.creating).toBe(false);
      act(() => arrive());
      await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
      expect(notices.filter((notice) => notice.kind === "info")).toEqual([]);
      holdArrival = false;
    });

    it("keeps the player in the lobby while the computer sits down, rather than letting them be sent to the table early", async () => {
      let answer: (outcome: { kind: "seated" }) => void = () => undefined;
      requestComputer.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      const { result } = render();
      act(() => result.current.playComputer());
      await waitFor(() => expect(requestComputer).toHaveBeenCalled());
      expect(headToTable).toHaveBeenCalledWith(12n);
      expect(headToTable.mock.invocationCallOrder[0]).toBeLessThan(
        requestComputer.mock.invocationCallOrder[0] ?? 0
      );
      await act(async () => answer({ kind: "seated" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
    });

    it("waits for the computer to be seated before opening the table", async () => {
      let answer: (outcome: { kind: "seated" }) => void = () => undefined;
      requestComputer.mockReturnValue(new Promise((resolve) => (answer = resolve)));
      const { result } = render();
      act(() => result.current.playComputer());
      await waitFor(() => expect(requestComputer).toHaveBeenCalled());
      expect(headingTo).not.toHaveBeenCalled();
      expect(result.current.callingComputer).toBe(true);
      await act(async () => answer({ kind: "seated" }));
      await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
    });

    it("says the computer is waking, in the same message", async () => {
      requestComputer.mockImplementation(async ({ onWaking }: { onWaking: () => void }) => {
        onWaking();
        return { kind: "seated" };
      });
      const { result } = render();
      act(() => result.current.playComputer());
      await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
      expect(notices).toContainEqual(
        expect.objectContaining({
          id: "play-computer",
          kind: "loading",
          title: lobbyCopy.wakingComputer,
        })
      );
    });

    it.each([
      ["taken", lobbyCopy.computerOutcome.taken],
      ["busy", lobbyCopy.computerOutcome.busy],
      ["too-many", lobbyCopy.computerOutcome["too-many"]],
      ["unavailable", lobbyCopy.computerOutcome.unavailable],
      ["unreachable", lobbyCopy.computerOutcome.unreachable],
    ] as const)("opens the table and says why when the computer is %s", async (kind, message) => {
      requestComputer.mockResolvedValue({ kind });
      const { result } = render();
      act(() => result.current.playComputer());
      await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
      expect(notices).toContainEqual(expect.objectContaining({ kind: "info", title: message }));
    });

    it("opens the table and says the computer can't play when asking it fails unexpectedly", async () => {
      requestComputer.mockRejectedValue(new Error("bad reply"));
      const { result } = render();
      act(() => result.current.playComputer());
      await waitFor(() => expect(push).toHaveBeenCalledWith("/table/12"));
      expect(notices).toContainEqual(
        expect.objectContaining({ kind: "info", title: lobbyCopy.computerOutcome.unavailable })
      );
      expect(console.error).toHaveBeenCalled();
    });

    it("stays in the lobby and never calls the computer when the table can't be made", async () => {
      takeSeat.mockRejectedValue(new Error("rejected"));
      const { result } = render();
      act(() => result.current.playComputer());
      await waitFor(() => expect(result.current.working).toBe(false));
      expect(requestComputer).not.toHaveBeenCalled();
      expect(push).not.toHaveBeenCalled();
    });
  });
});
