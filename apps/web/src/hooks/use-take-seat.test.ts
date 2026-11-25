import { bluffAbi } from "@bluff/contracts";
import { renderHook } from "@testing-library/react";
import { type Hex, decodeAbiParameters, encodeAbiParameters, encodeEventTopics } from "viem";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { contracts } from "@/config/chain";
import { ONE_CHIP } from "@/lib/chips";
import type { ContractCall } from "./use-send-move";
import { SEAT_RECHECK_LIMIT_MS, SEAT_RECHECK_MS, useTakeSeat } from "./use-take-seat";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const ME = "0x00000000000000000000000000000000000a11ce";
const OTHER = "0x0000000000000000000000000000000000000b0b";
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
vi.mock("@privy-io/react-auth", () => ({
  usePrivy: () => ({ user: { wallet: { address: ME } } }),
}));
vi.mock("@zama-fhe/react-sdk", () => ({ useEncrypt: () => ({ mutateAsync: encrypt }) }));
vi.mock("./use-send-move", () => ({ useSendMove: () => sendMove }));
const seatOnChain = vi.fn();
vi.mock("wagmi", () => ({
  usePublicClient: () => ({
    readContract: (request: { functionName: string; args: unknown[] }) =>
      seatOnChain(request.functionName, request.args),
  }),
}));

function gaveUp(): Error {
  const error = new Error("The wallet stopped waiting.");
  error.name = "AbortError";
  return error;
}

function joined(id: bigint, player: string, address: string = contracts.bluff) {
  return {
    address,
    topics: encodeEventTopics({
      abi: bluffAbi,
      eventName: "PlayerJoined",
      args: { id, player: player as Hex },
    }),
    data: encodeAbiParameters([{ type: "uint8" }], [1]),
    blockNumber: 1n,
    logIndex: 0,
    transactionHash: "0x99",
    transactionIndex: 0,
    blockHash: "0x01",
    removed: false,
  };
}

function lastCall(): ContractCall {
  const call = sendMove.mock.calls.at(-1)?.[0] as ContractCall | undefined;
  if (!call) throw new Error("No move was sent.");
  return call;
}

beforeEach(() => {
  encrypt.mockResolvedValue({ encryptedValues: [SEALED], inputProof: PROOF });
  sendMove.mockResolvedValue({ transactionHash: "0x99", logs: [joined(12n, ME)] });
});

afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("useTakeSeat", () => {
  it("creates a free table and returns its number", async () => {
    const { result } = renderHook(() => useTakeSeat());
    await expect(
      result.current({ kind: "create", seatCount: 3, buyIn: 0n, isPrivate: true }, vi.fn())
    ).resolves.toBe(12n);
    expect(lastCall()).toMatchObject({
      address: contracts.bluff,
      functionName: "createFreeTable",
      args: [3, true],
    });
    expect(encrypt).not.toHaveBeenCalled();
  });

  it("joins a free table by its number", async () => {
    const { result } = renderHook(() => useTakeSeat());
    await result.current({ kind: "join", tableId: 12n, buyIn: 0n }, vi.fn());
    expect(lastCall()).toMatchObject({ functionName: "joinFreeTable", args: [12n] });
  });

  it("pays the exact sealed buy-in to the cashier to create a paid table", async () => {
    const { result } = renderHook(() => useTakeSeat());
    await result.current(
      { kind: "create", seatCount: 2, buyIn: 25n * ONE_CHIP, isPrivate: false },
      vi.fn()
    );
    expect(encrypt).toHaveBeenCalledWith({
      values: [{ type: "euint64", value: 25n * ONE_CHIP }],
      contractAddress: contracts.chips,
      userAddress: ME,
    });
    const call = lastCall();
    expect(call).toMatchObject({
      address: contracts.chips,
      functionName: "confidentialTransferAndCall",
    });
    const [to, handle, proof, data] = call.args as [string, Hex, Hex, Hex];
    expect([to, handle, proof]).toEqual([contracts.cashier, SEALED, PROOF]);
    expect(decodeAbiParameters(REQUEST, data)).toEqual([0, 0n, 2, 25n * ONE_CHIP, false]);
  });

  it("pays to join a paid table", async () => {
    const { result } = renderHook(() => useTakeSeat());
    await result.current({ kind: "join", tableId: 7n, buyIn: 10n * ONE_CHIP }, vi.fn());
    const [, , , data] = lastCall().args as [string, Hex, Hex, Hex];
    expect(decodeAbiParameters(REQUEST, data)).toEqual([1, 7n, 0, 0n, false]);
  });

  it("refuses to report a seat that the receipt does not show for this player", async () => {
    sendMove.mockResolvedValue({
      transactionHash: "0x99",
      logs: [joined(12n, OTHER), joined(12n, ME, OTHER)],
    });
    const { result } = renderHook(() => useTakeSeat());
    await expect(
      result.current({ kind: "join", tableId: 12n, buyIn: 0n }, vi.fn())
    ).rejects.toThrow("was not recorded");
  });

  describe("when the wallet stops waiting before the seat lands", () => {
    it("finds the new table on the chain and carries on as if nothing went wrong", async () => {
      vi.useFakeTimers();
      sendMove.mockRejectedValue(gaveUp());
      seatOnChain.mockResolvedValueOnce(0n).mockResolvedValue(13n);
      const { result } = renderHook(() => useTakeSeat());
      const seated = result.current(
        { kind: "create", seatCount: 2, buyIn: 0n, isPrivate: false },
        vi.fn()
      );
      await vi.advanceTimersByTimeAsync(SEAT_RECHECK_MS * 2);
      await expect(seated).resolves.toBe(13n);
      expect(seatOnChain).toHaveBeenCalledWith("tableOf", [ME]);
    });

    it("finds the joined table, and only that one", async () => {
      vi.useFakeTimers();
      sendMove.mockRejectedValue(gaveUp());
      seatOnChain.mockResolvedValue(12n);
      const { result } = renderHook(() => useTakeSeat());
      const seated = result.current({ kind: "join", tableId: 12n, buyIn: 0n }, vi.fn());
      await vi.advanceTimersByTimeAsync(SEAT_RECHECK_MS);
      await expect(seated).resolves.toBe(12n);
    });

    it("still says it may go through when the seat never shows up", async () => {
      vi.useFakeTimers();
      sendMove.mockRejectedValue(gaveUp());
      seatOnChain.mockResolvedValue(0n);
      const { result } = renderHook(() => useTakeSeat());
      const seated = result.current({ kind: "join", tableId: 12n, buyIn: 0n }, vi.fn());
      const outcome = expect(seated).rejects.toThrow("The wallet stopped waiting.");
      await vi.advanceTimersByTimeAsync(SEAT_RECHECK_LIMIT_MS + SEAT_RECHECK_MS);
      await outcome;
    });

    it("never mistakes a seat at another table for this one", async () => {
      vi.useFakeTimers();
      sendMove.mockRejectedValue(gaveUp());
      seatOnChain.mockResolvedValue(99n);
      const { result } = renderHook(() => useTakeSeat());
      const seated = result.current({ kind: "join", tableId: 12n, buyIn: 0n }, vi.fn());
      const outcome = expect(seated).rejects.toThrow("The wallet stopped waiting.");
      await vi.advanceTimersByTimeAsync(SEAT_RECHECK_LIMIT_MS + SEAT_RECHECK_MS);
      await outcome;
    });

    it("passes any other failure straight on, without waiting", async () => {
      sendMove.mockRejectedValue(new Error("rpc down"));
      const { result } = renderHook(() => useTakeSeat());
      await expect(
        result.current({ kind: "join", tableId: 12n, buyIn: 0n }, vi.fn())
      ).rejects.toThrow("rpc down");
      expect(seatOnChain).not.toHaveBeenCalled();
    });
  });
});
