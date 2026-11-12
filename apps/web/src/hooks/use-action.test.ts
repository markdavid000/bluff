import { act, renderHook } from "@testing-library/react";
import { ContractFunctionExecutionError, UserRejectedRequestError } from "viem";
import { bluffAbi } from "@bluff/contracts";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { errorCopy } from "@/lib/copy";
import { type Notice, onNotice } from "@/lib/notify";
import { BUSY_AFTER_MS, MIN_SHOWN_MS, SHOW_AFTER_MS, useAction } from "./use-action";

let notices: (Notice | { dismissed: string })[] = [];
let stop: () => void;

beforeEach(() => {
  vi.useFakeTimers();
  notices = [];
  stop = onNotice((event) =>
    notices.push(event.type === "show" ? event.notice : { dismissed: event.id })
  );
  vi.spyOn(console, "error").mockImplementation(() => undefined);
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

function deferred() {
  let resolve!: () => void;
  let reject!: (error: unknown) => void;
  const promise = new Promise<void>((yes, no) => {
    resolve = yes;
    reject = no;
  });
  return { promise, resolve, reject };
}

describe("useAction", () => {
  it("is working the instant it starts, before any message", () => {
    const move = deferred();
    const { result } = renderHook(() =>
      useAction({ id: "bid", working: "Placing your bid…", run: () => move.promise })
    );
    act(() => result.current.start());
    expect(result.current.working).toBe(true);
    expect(notices).toEqual([]);
  });

  it("shows no message for a move that ends within 300 ms", async () => {
    const move = deferred();
    const { result } = renderHook(() =>
      useAction({ id: "bid", working: "Placing your bid…", run: () => move.promise })
    );
    act(() => result.current.start());
    await act(async () => {
      vi.advanceTimersByTime(SHOW_AFTER_MS - 50);
      move.resolve();
    });
    expect(notices).toEqual([]);
    expect(result.current.status.kind).toBe("done");
  });

  it("shows one working message after 300 ms and keeps it for at least 500 ms", async () => {
    const move = deferred();
    const { result } = renderHook(() =>
      useAction({
        id: "bid",
        working: "Placing your bid…",
        done: "Bid placed",
        run: () => move.promise,
      })
    );
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(SHOW_AFTER_MS));
    expect(notices).toEqual([{ id: "bid", kind: "loading", title: "Placing your bid…" }]);
    await act(async () => move.resolve());
    expect(result.current.status.kind).not.toBe("done");
    await act(async () => vi.advanceTimersByTime(MIN_SHOWN_MS));
    expect(result.current.status.kind).toBe("done");
    expect(notices.at(-1)).toEqual({ id: "bid", kind: "success", title: "Bid placed" });
  });

  it("says the network is busy after 15 seconds, in the same message", () => {
    const move = deferred();
    const { result } = renderHook(() =>
      useAction({ id: "bid", working: "Placing your bid…", run: () => move.promise })
    );
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(BUSY_AFTER_MS));
    expect(notices.at(-1)).toEqual({
      id: "bid",
      kind: "loading",
      title: errorCopy.stillWorking("Placing your bid…"),
    });
    expect(
      new Set(notices.map((notice) => ("id" in notice ? notice.id : notice.dismissed)))
    ).toEqual(new Set(["bid"]));
  });

  it("reports each step the move goes through", async () => {
    const steps: string[] = [];
    const { result } = renderHook(() =>
      useAction({
        id: "bid",
        working: "Placing your bid…",
        run: async (report) => {
          report("confirming");
          steps.push(result.current.status.kind);
          report("waiting");
        },
      })
    );
    await act(async () => result.current.start());
    expect(result.current.status.kind).toBe("done");
  });

  it("explains a failure in plain words and offers to try again", async () => {
    const run = vi.fn().mockRejectedValueOnce(new Error("boom")).mockResolvedValueOnce(undefined);
    const { result } = renderHook(() =>
      useAction({ id: "claim", working: "Getting your chips…", run })
    );
    await act(async () => result.current.start());
    await act(async () => vi.advanceTimersByTime(MIN_SHOWN_MS));
    expect(result.current.status).toEqual({ kind: "failed", reason: errorCopy.generic });
    const failure = notices.at(-1) as Notice;
    expect(failure.kind).toBe("error");
    expect(failure.action?.label).toBe(errorCopy.tryAgain);
    await act(async () => failure.action?.onPress());
    await act(async () => vi.advanceTimersByTime(MIN_SHOWN_MS));
    expect(run).toHaveBeenCalledTimes(2);
    expect(result.current.status.kind).toBe("done");
  });

  it("treats a cancel in the wallet as a short note, not an error", async () => {
    const rejection = new ContractFunctionExecutionError(
      new UserRejectedRequestError(new Error("User rejected")),
      { abi: bluffAbi, functionName: "placeBid", args: [] }
    );
    const { result } = renderHook(() =>
      useAction({ id: "bid", working: "Placing your bid…", run: () => Promise.reject(rejection) })
    );
    await act(async () => result.current.start());
    await act(async () => vi.advanceTimersByTime(MIN_SHOWN_MS));
    expect(notices.at(-1)).toEqual({ id: "bid", kind: "info", title: errorCopy.cancelled });
  });

  it("stays silent for quiet moves that succeed", async () => {
    const move = deferred();
    const { result } = renderHook(() =>
      useAction({
        id: "keeper",
        working: "Keeping the table moving…",
        quiet: true,
        run: () => move.promise,
      })
    );
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(BUSY_AFTER_MS));
    await act(async () => move.resolve());
    expect(notices).toEqual([]);
  });
});
