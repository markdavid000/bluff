import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import { ONE_CHIP } from "@/lib/chips";
import type { LobbyTable } from "../lib/tables";
import { PLAY_NOW_SEATS, pickTableToJoin, useSitDown } from "./use-sit-down";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";
const takeSeat = vi.fn();
const push = vi.fn();
const router = { push };
const invalidateBalanceQueries = vi.fn();

vi.mock("next/navigation", () => ({ useRouter: () => router }));
vi.mock("@/hooks/use-take-seat", () => ({ useTakeSeat: () => takeSeat }));
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

beforeEach(() => {
  takeSeat.mockResolvedValue(12n);
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
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
    act(() => result.current.playNow([table(4n, 1, 4, 0n), table(5n, 2, 3, 0n)], 0n));
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "join", tableId: 5n, buyIn: 0n },
      expect.any(Function)
    );
  });

  it("plays now by opening a public table for two when nothing matches", async () => {
    const { result } = render();
    act(() => result.current.playNow([table(4n, 1, 2, 10n * ONE_CHIP)], 0n));
    await waitFor(() => expect(push).toHaveBeenCalledOnce());
    expect(takeSeat).toHaveBeenCalledWith(
      { kind: "create", seatCount: PLAY_NOW_SEATS, buyIn: 0n, isPrivate: false },
      expect.any(Function)
    );
  });

  it("stays in the lobby when the move fails", async () => {
    takeSeat.mockRejectedValue(new Error("The table filled up."));
    const { result } = render();
    act(() => result.current.join({ kind: "join", tableId: 12n, buyIn: 0n }));
    await waitFor(() => expect(result.current.working).toBe(false));
    expect(push).not.toHaveBeenCalled();
  });
});
