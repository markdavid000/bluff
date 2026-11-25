import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { COMPUTER_PLAYERS } from "@/config/computer-players";
import type { ComputerCall } from "@/hooks/use-computer-call";
import { onNotice } from "@/lib/notify";
import { tableCopy } from "../copy";
import { type ArrivalTable, COMPUTER_SEAT_WAIT_MS } from "../lib/computer-arrival";
import { COMPUTER_ARRIVAL, useComputerArrival } from "./use-computer-arrival";

const ME = "0x0000000000000000000000000000000000001a2b";
const BABA = COMPUTER_PLAYERS[0] ?? ME;

let call: ComputerCall | null = null;
const finishComputerCall = vi.fn();
vi.mock("@/hooks/use-computer-call", () => ({
  useComputerCall: () => call,
  finishComputerCall: (id: bigint) => finishComputerCall(id),
}));

type Event =
  { type: "show"; kind: string; title: string; id: string } | { type: "dismiss"; id: string };
let events: Event[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  events = [];
  stop = onNotice((event) => {
    events.push(
      event.type === "show"
        ? { type: "show", kind: event.notice.kind, title: event.notice.title, id: event.notice.id }
        : event
    );
  });
});

afterEach(() => {
  stop();
  call = null;
  vi.clearAllMocks();
});

function table(seats: { player: string; ready: boolean }[]): ArrivalTable {
  return { id: 12n, status: "waiting", seats };
}

describe("useComputerArrival", () => {
  it("changes one toast as the computer joins, gets ready and arrives", () => {
    call = { tableId: 12n, phase: "asking", outcome: null, answeredAt: null };
    const { rerender } = renderHook((current: ArrivalTable) => useComputerArrival(current), {
      initialProps: table([{ player: ME, ready: false }]),
    });
    expect(events).toEqual([
      { type: "show", kind: "loading", title: tableCopy.computerJoining, id: COMPUTER_ARRIVAL },
    ]);
    rerender(
      table([
        { player: ME, ready: false },
        { player: BABA, ready: false },
      ])
    );
    expect(events.at(-1)).toEqual({
      type: "show",
      kind: "loading",
      title: tableCopy.computerGettingReady,
      id: COMPUTER_ARRIVAL,
    });
    rerender(
      table([
        { player: ME, ready: false },
        { player: BABA, ready: true },
      ])
    );
    expect(events.at(-1)).toEqual({ type: "dismiss", id: COMPUTER_ARRIVAL });
    expect(finishComputerCall).toHaveBeenCalledWith(12n);
  });

  it("says the computer is coming only while it's on its way", () => {
    call = { tableId: 12n, phase: "asking", outcome: null, answeredAt: null };
    const { result, rerender } = renderHook(
      (current: ArrivalTable) => useComputerArrival(current),
      { initialProps: table([{ player: ME, ready: false }]) }
    );
    expect(result.current.computerComing).toBe(true);
    rerender(
      table([
        { player: ME, ready: false },
        { player: BABA, ready: true },
      ])
    );
    expect(result.current.computerComing).toBe(false);
  });

  it("says the computer isn't coming once it has said why", () => {
    call = { tableId: 12n, phase: "answered", outcome: { kind: "busy" }, answeredAt: 1 };
    const { result } = renderHook(() => useComputerArrival(table([{ player: ME, ready: false }])));
    expect(result.current.computerComing).toBe(false);
  });

  it("shows nothing when the computer was not called here", () => {
    renderHook(() => useComputerArrival(table([{ player: ME, ready: false }])));
    expect(events).toEqual([]);
  });

  it("says why the computer isn't coming, in place of the joining message", () => {
    call = { tableId: 12n, phase: "answered", outcome: { kind: "busy" }, answeredAt: 1 };
    renderHook(() => useComputerArrival(table([{ player: ME, ready: false }])));
    expect(events.at(-1)).toEqual({
      type: "show",
      kind: "info",
      title: tableCopy.computerOutcome.busy,
      id: COMPUTER_ARRIVAL,
    });
    expect(finishComputerCall).toHaveBeenCalledWith(12n);
  });

  it("keeps the reason on screen when the computer isn't coming, rather than clearing it", () => {
    call = { tableId: 12n, phase: "asking", outcome: null, answeredAt: null };
    const { rerender } = renderHook(
      (current: ComputerCall | null) => {
        call = current;
        return useComputerArrival(table([{ player: ME, ready: false }]));
      },
      { initialProps: call }
    );
    rerender({ tableId: 12n, phase: "answered", outcome: { kind: "busy" }, answeredAt: 1 });
    expect(events.at(-1)).toEqual({
      type: "show",
      kind: "info",
      title: tableCopy.computerOutcome.busy,
      id: COMPUTER_ARRIVAL,
    });
  });

  it("stops saying the computer is joining when it said yes but never sat down", () => {
    vi.useFakeTimers();
    call = { tableId: 12n, phase: "answered", outcome: { kind: "seated" }, answeredAt: Date.now() };
    const { result } = renderHook(() => useComputerArrival(table([{ player: ME, ready: false }])));
    expect(result.current.computerComing).toBe(true);
    act(() => {
      vi.advanceTimersByTime(COMPUTER_SEAT_WAIT_MS + 1_000);
    });
    expect(result.current.computerComing).toBe(false);
    expect(events.at(-1)).toEqual({
      type: "show",
      kind: "info",
      title: tableCopy.computerOutcome.unavailable,
      id: COMPUTER_ARRIVAL,
    });
    expect(finishComputerCall).toHaveBeenCalledWith(12n);
    vi.useRealTimers();
  });

  it("takes the toast away if the player leaves before the computer arrives", () => {
    call = { tableId: 12n, phase: "asking", outcome: null, answeredAt: null };
    const { unmount } = renderHook(() => useComputerArrival(table([{ player: ME, ready: false }])));
    act(() => unmount());
    expect(events.at(-1)).toEqual({ type: "dismiss", id: COMPUTER_ARRIVAL });
  });
});
