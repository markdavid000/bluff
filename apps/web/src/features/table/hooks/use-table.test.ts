import { bluffAbi } from "@bluff/contracts";
import { act, renderHook } from "@testing-library/react";
import {
  ContractFunctionExecutionError,
  ContractFunctionRevertedError,
  encodeErrorResult,
} from "viem";
import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetBlocks, seeBlock } from "@/lib/block-clock";
import { markLeftTable } from "@/hooks/use-left-tables";
import { isNotTableRead, useTable } from "./use-table";

vi.mock("@/config/env", () => ({
  publicEnv: { privyAppId: "test-app", sepoliaRpcUrl: "http://127.0.0.1:8545" },
}));

const HOST = "0x0000000000000000000000000000000000001a2b";
const refetch = vi.fn();
let read: Record<string, unknown> = {};
let readAtBlock: ((blockNumber?: bigint) => Record<string, unknown>) | null = null;
const requests: { blockNumber?: bigint; args: unknown[]; query?: { enabled?: boolean } }[] = [];

vi.mock("wagmi", () => ({
  useReadContract: (request: {
    blockNumber?: bigint;
    args: unknown[];
    query?: { enabled?: boolean };
  }) => {
    requests.push(request);
    return { refetch, ...(readAtBlock ? readAtBlock(request.blockNumber) : read) };
  },
}));

const TABLE = {
  id: 12n,
  host: HOST,
  status: 1,
  isPrivate: false,
  seatCount: 2,
  playerCount: 1,
  dicePerPlayer: 4,
  diceInPlay: 0,
  buyIn: 0n,
  createdAt: 0n,
  startedAt: 0n,
  deadline: 600n,
  round: 0,
  turn: 0,
  roundStarter: 0,
  bidQuantity: 0,
  bidFace: 0,
  bidder: 0,
  caller: 0,
};

function revertedWith(errorName: string, args: unknown[]) {
  const data = encodeErrorResult({ abi: bluffAbi, errorName, args } as Parameters<
    typeof encodeErrorResult
  >[0]);
  const cause = new ContractFunctionRevertedError({
    abi: bluffAbi,
    data,
    functionName: "getTable",
  });
  return new ContractFunctionExecutionError(cause, {
    abi: bluffAbi,
    functionName: "getTable",
    args: [],
  });
}

afterEach(() => {
  forgetBlocks();
  readAtBlock = null;
  requests.length = 0;
  vi.clearAllMocks();
});

describe("isNotTableRead", () => {
  it("picks every chain read except the table itself, for refreshing after leaving", () => {
    expect(isNotTableRead({ queryKey: ["readContract", { functionName: "getTable" }] })).toBe(
      false
    );
    expect(isNotTableRead({ queryKey: ["readContract", { functionName: "tableOf" }] })).toBe(true);
    expect(isNotTableRead({ queryKey: ["readContract"] })).toBe(true);
  });
});

describe("useTable", () => {
  it("stops reading a table the player just left, so it doesn't redraw before the lobby", () => {
    const { rerender, unmount } = renderHook(() => useTable(12n));
    expect(requests.at(-1)?.query?.enabled).not.toBe(false);
    act(() => markLeftTable(12n));
    rerender();
    expect(requests.at(-1)?.query?.enabled).toBe(false);
    unmount();
    requests.length = 0;
    renderHook(() => useTable(12n));
    expect(requests.at(-1)?.query?.enabled).not.toBe(false);
  });

  it("is loading while the table is read", () => {
    read = { isError: false, data: undefined };
    expect(renderHook(() => useTable(12n)).result.current.status).toBe("loading");
  });

  it("reads a table it has not seen yet at the latest block, even when the app remembers an older one", () => {
    read = { isError: false, data: undefined };
    seeBlock(900n);
    renderHook(() => useTable(12n));
    expect(requests.at(-1)).toMatchObject({ args: [12n] });
    expect(requests.at(-1)?.blockNumber).toBeUndefined();
  });

  it("pins reads to the newest block once the table is on screen", () => {
    read = { isError: false, data: [TABLE, []] };
    seeBlock(900n);
    const { rerender } = renderHook(() => useTable(12n));
    rerender();
    expect(requests.at(-1)?.blockNumber).toBe(900n);
  });

  it("never trusts 'not found' from a read pinned to an older block, and asks for the latest instead", () => {
    read = { isError: false, data: [TABLE, []] };
    seeBlock(900n);
    const { result, rerender } = renderHook(() => useTable(12n));
    rerender();
    expect(requests.at(-1)?.blockNumber).toBe(900n);
    readAtBlock = (blockNumber) =>
      blockNumber === undefined
        ? { isError: false, isPending: true, data: undefined }
        : { isError: true, error: revertedWith("TableNotFound", [12n]), data: undefined };
    rerender();
    expect(result.current.status).toBe("loading");
    expect(requests.at(-1)?.blockNumber).toBeUndefined();
  });

  it("never shows another table's answer while this one loads", () => {
    read = { isError: false, isPlaceholderData: true, data: [{ ...TABLE, id: 11n }, []] };
    expect(renderHook(() => useTable(12n)).result.current.status).toBe("loading");
  });

  it("reads the latest table before any block is known", () => {
    read = { isError: false, data: undefined };
    renderHook(() => useTable(12n));
    expect(requests.at(-1)?.blockNumber).toBeUndefined();
  });

  it("is ready with the table and its seats", () => {
    read = {
      isError: false,
      data: [TABLE, [{ player: HOST, dice: 0, missedTurns: 0, isActive: true, ready: false }]],
    };
    const { result } = renderHook(() => useTable(12n));
    expect(result.current).toMatchObject({
      status: "ready",
      table: { id: 12n, status: "waiting" },
    });
  });

  it("says which block the table on screen was read at", () => {
    const data = [TABLE, []];
    seeBlock(900n);
    read = { isError: false, isPlaceholderData: false, data };
    const { result, rerender } = renderHook(() => useTable(12n));
    rerender();
    expect(result.current).toMatchObject({ readAt: 900n });
  });

  it("reports no block while a newer read is still loading behind the old table", () => {
    seeBlock(900n);
    read = { isError: false, isPlaceholderData: true, data: [TABLE, []] };
    expect(renderHook(() => useTable(12n)).result.current).toMatchObject({ readAt: null });
  });

  it("tells a table that does not exist apart from a failed read", () => {
    read = { isError: true, error: revertedWith("TableNotFound", [12n]), data: undefined };
    expect(renderHook(() => useTable(12n)).result.current.status).toBe("not-found");
  });

  it("offers to try again when the read failed", () => {
    read = { isError: true, error: new Error("network"), data: undefined };
    const { result } = renderHook(() => useTable(12n));
    expect(result.current.status).toBe("failed");
    if (result.current.status !== "failed") throw new Error("Expected a failure.");
    result.current.retry();
    expect(refetch).toHaveBeenCalledOnce();
  });
});
