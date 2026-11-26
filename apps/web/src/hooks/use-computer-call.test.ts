import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { callComputer, finishComputerCall, useComputerCall } from "./use-computer-call";

vi.mock("@/config/env", () => ({
  publicEnv: {
    privyAppId: "test-app",
    sepoliaRpcUrl: "http://127.0.0.1:8545",
    botUrl: "https://bot.example",
  },
}));

const requestComputer = vi.fn();
vi.mock("@/lib/computer-seat", () => ({
  requestComputer: (...args: unknown[]) => requestComputer(...args),
}));

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (error: unknown) => void = () => undefined;
  const promise = new Promise<T>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

afterEach(() => {
  act(() => finishComputerCall(12n));
  vi.restoreAllMocks();
  requestComputer.mockReset();
});

describe("useComputerCall", () => {
  it("follows the call from asking, through waking, to the answer and when it came", async () => {
    const answer = deferred<{ kind: "seated" }>();
    let wake: () => void = () => undefined;
    requestComputer.mockImplementation(({ onWaking }: { onWaking: () => void }) => {
      wake = onWaking;
      return answer.promise;
    });
    const { result } = renderHook(() => useComputerCall());
    expect(result.current).toBeNull();
    act(() => callComputer(12n));
    expect(requestComputer).toHaveBeenCalledWith(
      expect.objectContaining({ botUrl: "https://bot.example", tableId: 12n })
    );
    expect(result.current).toEqual({
      tableId: 12n,
      phase: "asking",
      outcome: null,
      answeredAt: null,
    });
    act(() => wake());
    expect(result.current).toEqual({
      tableId: 12n,
      phase: "waking",
      outcome: null,
      answeredAt: null,
    });
    const before = Date.now();
    await act(async () => answer.resolve({ kind: "seated" }));
    expect(result.current).toEqual({
      tableId: 12n,
      phase: "answered",
      outcome: { kind: "seated" },
      answeredAt: expect.any(Number),
    });
    expect(result.current?.answeredAt).toBeGreaterThanOrEqual(before);
  });

  it("treats an answer it can't read as the computer being unable to play, and says so in the console", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    requestComputer.mockRejectedValue(new Error("bad reply"));
    const { result } = renderHook(() => useComputerCall());
    await act(async () => callComputer(12n));
    expect(result.current?.outcome).toEqual({ kind: "unavailable" });
    expect(console.error).toHaveBeenCalled();
  });

  it("forgets the call once it's finished, and ignores a late answer for a call already finished", async () => {
    const answer = deferred<{ kind: "seated" }>();
    requestComputer.mockReturnValue(answer.promise);
    const { result } = renderHook(() => useComputerCall());
    act(() => callComputer(12n));
    act(() => finishComputerCall(12n));
    expect(result.current).toBeNull();
    await act(async () => answer.resolve({ kind: "seated" }));
    expect(result.current).toBeNull();
  });

  it("leaves a newer call alone when an older table is finished", () => {
    requestComputer.mockReturnValue(new Promise(() => undefined));
    const { result } = renderHook(() => useComputerCall());
    act(() => callComputer(12n));
    act(() => finishComputerCall(7n));
    expect(result.current?.tableId).toBe(12n);
  });
});
