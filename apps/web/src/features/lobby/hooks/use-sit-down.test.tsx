import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { type Hex, decodeAbiParameters } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import type { ContractCall } from "@/hooks/use-send-move";
import { ONE_CHIP } from "@/lib/chips";
import type { LobbyTable } from "../lib/tables";
import { PLAY_NOW_SEATS, pickTableToJoin, useSitDown } from "./use-sit-down";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ACCOUNT = "0x00000000000000000000000000000000000a11ce";
const SEALED: Hex = `0x${"cd".repeat(32)}`;
const PROOF: Hex = "0x1234";
const REQUEST = [
  { type: "uint8" },
  { type: "uint256" },
  { type: "uint8" },
  { type: "uint64" },
  { type: "bool" },
] as const;

const sendMove = vi.fn();
const encrypt = vi.fn();
const invalidateBalanceQueries = vi.fn();

vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ACCOUNT } } }),
}));
vi.mock("@zama-fhe/react-sdk", () => ({ useEncrypt: () => ({ mutateAsync: encrypt }) }));
vi.mock("@zama-fhe/sdk/query", () => ({
  invalidateBalanceQueries: (...args: unknown[]) => invalidateBalanceQueries(...args),
}));
vi.mock("@/hooks/use-send-move", () => ({ useSendMove: () => sendMove }));

function table(id: bigint, players: number, seats: number, buyIn: bigint): LobbyTable {
  return {
    id,
    host: ACCOUNT,
    waiting: true,
    isPrivate: false,
    seatCount: seats,
    playerCount: players,
    buyIn,
    closesAt: 0,
  };
}

function render(onSeated = vi.fn()) {
  const queryClient = new QueryClient();
  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }
  return { onSeated, ...renderHook(() => useSitDown({ onSeated }), { wrapper: Wrapper }) };
}

function lastCall(): ContractCall {
  const call = sendMove.mock.calls.at(-1)?.[0] as ContractCall | undefined;
  if (!call) throw new Error("No move was sent.");
  return call;
}

beforeEach(() => {
  sendMove.mockResolvedValue({ status: "success" });
  encrypt.mockResolvedValue({ encryptedValues: [SEALED], inputProof: PROOF });
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

  it("finds nothing when no table matches or has a free seat", () => {
    expect(pickTableToJoin([table(1n, 2, 2, 0n), table(2n, 1, 2, 25n * ONE_CHIP)], 0n)).toBeNull();
  });
});

describe("useSitDown", () => {
  it("creates a free table without touching chips", async () => {
    const { result, onSeated } = render();
    act(() => result.current.create({ kind: "create", seatCount: 3, buyIn: 0n, isPrivate: true }));
    await waitFor(() => expect(onSeated).toHaveBeenCalledOnce());
    expect(lastCall()).toMatchObject({
      address: contracts.bluff,
      functionName: "createFreeTable",
      args: [3, true],
    });
    expect(encrypt).not.toHaveBeenCalled();
  });

  it("joins a free table by its number", async () => {
    const { result, onSeated } = render();
    act(() => result.current.join({ kind: "join", tableId: 12n, buyIn: 0n }));
    await waitFor(() => expect(onSeated).toHaveBeenCalledOnce());
    expect(lastCall()).toMatchObject({ functionName: "joinFreeTable", args: [12n] });
  });

  it("pays the exact sealed buy-in to the cashier to create a paid table", async () => {
    const { result, onSeated } = render();
    act(() =>
      result.current.create({
        kind: "create",
        seatCount: 2,
        buyIn: 25n * ONE_CHIP,
        isPrivate: false,
      })
    );
    await waitFor(() => expect(onSeated).toHaveBeenCalledOnce());
    expect(encrypt).toHaveBeenCalledWith({
      values: [{ type: "euint64", value: 25n * ONE_CHIP }],
      contractAddress: contracts.chips,
      userAddress: ACCOUNT,
    });
    const call = lastCall();
    expect(call).toMatchObject({
      address: contracts.chips,
      functionName: "confidentialTransferAndCall",
    });
    const [to, handle, proof, data] = call.args as [string, Hex, Hex, Hex];
    expect([to, handle, proof]).toEqual([contracts.cashier, SEALED, PROOF]);
    expect(decodeAbiParameters(REQUEST, data)).toEqual([0, 0n, 2, 25n * ONE_CHIP, false]);
    expect(invalidateBalanceQueries).toHaveBeenCalledWith(expect.anything(), contracts.chips);
  });

  it("pays to join a paid table", async () => {
    const { result, onSeated } = render();
    act(() => result.current.join({ kind: "join", tableId: 7n, buyIn: 10n * ONE_CHIP }));
    await waitFor(() => expect(onSeated).toHaveBeenCalledOnce());
    const [, , , data] = lastCall().args as [string, Hex, Hex, Hex];
    expect(decodeAbiParameters(REQUEST, data)).toEqual([1, 7n, 0, 0n, false]);
  });

  it("plays now by joining the fullest matching table", async () => {
    const { result, onSeated } = render();
    act(() => result.current.playNow([table(4n, 1, 4, 0n), table(5n, 2, 3, 0n)], 0n));
    await waitFor(() => expect(onSeated).toHaveBeenCalledOnce());
    expect(lastCall()).toMatchObject({ functionName: "joinFreeTable", args: [5n] });
  });

  it("plays now by opening a public table for two when nothing matches", async () => {
    const { result, onSeated } = render();
    act(() => result.current.playNow([table(4n, 1, 2, 10n * ONE_CHIP)], 0n));
    await waitFor(() => expect(onSeated).toHaveBeenCalledOnce());
    expect(lastCall()).toMatchObject({
      functionName: "createFreeTable",
      args: [PLAY_NOW_SEATS, false],
    });
  });

  it("stays in the lobby when the move fails", async () => {
    sendMove.mockRejectedValue(new Error("The table filled up."));
    const { result, onSeated } = render();
    act(() => result.current.join({ kind: "join", tableId: 12n, buyIn: 0n }));
    await waitFor(() => expect(result.current.working).toBe(false));
    expect(onSeated).not.toHaveBeenCalled();
  });
});
