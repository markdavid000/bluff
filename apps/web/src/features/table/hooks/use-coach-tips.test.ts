import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BidRisk } from "@/lib/bid-odds";
import type { Bid } from "@/lib/bid-rules";
import { type Notice, onNotice } from "@/lib/notify";
import { tableCopy } from "../copy";
import { COACH_DELAY_MS, COACH_STAYS_MS, useCoachTips } from "./use-coach-tips";

let shown: Notice[] = [];
let dismissed: string[] = [];
let stop: () => void = () => undefined;
const onPick = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  shown = [];
  dismissed = [];
  stop = onNotice((event) => {
    if (event.type === "show") shown.push(event.notice);
    else dismissed.push(event.id);
  });
});

afterEach(() => {
  stop();
  vi.useRealTimers();
  vi.clearAllMocks();
});

function render(start: {
  myTurn: boolean;
  choice: Bid | null;
  risk: BidRisk | null;
  safer: Bid | null;
  paused?: boolean;
}) {
  let props = start;
  const hook = renderHook(() => useCoachTips({ paused: false, ...props, onPick }));
  return {
    ...hook,
    change: (next: Partial<typeof start>) => {
      props = { ...props, ...next };
      hook.rerender();
    },
  };
}

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useCoachTips", () => {
  it("stays quiet while a first-game tip has the turn, without closing it", () => {
    render({
      myTurn: true,
      choice: { quantity: 1, face: 6 },
      risk: "safe",
      safer: null,
      paused: true,
    });
    wait(COACH_DELAY_MS);
    expect(shown).toEqual([]);
    expect(dismissed).toEqual([]);
  });

  it("tells the player how safe their bid looks once their turn starts", () => {
    render({ myTurn: true, choice: { quantity: 1, face: 6 }, risk: "safe", safer: null });
    expect(shown).toEqual([]);
    wait(COACH_DELAY_MS);
    expect(shown.map((notice) => notice.title)).toEqual([tableCopy.coachTip.safe("1 × six")]);
    expect(shown[0]?.action).toBeUndefined();
  });

  it("keeps the tip up longer than a passing notice", () => {
    render({ myTurn: true, choice: { quantity: 1, face: 6 }, risk: "safe", safer: null });
    wait(COACH_DELAY_MS);
    expect(shown[0]?.staysMs).toBe(COACH_STAYS_MS);
  });

  it("suggests a safer bid, one tap away, when the chosen one looks risky", () => {
    render({
      myTurn: true,
      choice: { quantity: 5, face: 5 },
      risk: "very-risky",
      safer: { quantity: 3, face: 4 },
    });
    wait(COACH_DELAY_MS);
    const tip = shown[0];
    expect(tip?.title).toBe(tableCopy.coachTip["very-risky"]("5 × five"));
    expect(tip?.action?.label).toBe(tableCopy.trySafer("3 × four"));
    tip?.action?.onPress();
    expect(onPick).toHaveBeenCalledWith({ quantity: 3, face: 4 });
  });

  it("waits for the player to settle on a bid before speaking again", () => {
    const { change } = render({
      myTurn: true,
      choice: { quantity: 1, face: 6 },
      risk: "safe",
      safer: null,
    });
    wait(COACH_DELAY_MS);
    change({ choice: { quantity: 2, face: 6 }, risk: "risky" });
    wait(COACH_DELAY_MS / 2);
    change({ choice: { quantity: 3, face: 6 }, risk: "very-risky" });
    wait(COACH_DELAY_MS);
    expect(shown.map((notice) => notice.title)).toEqual([
      tableCopy.coachTip.safe("1 × six"),
      tableCopy.coachTip["very-risky"]("3 × six"),
    ]);
  });

  it("keeps quiet on someone else's turn, and clears its tip when the turn ends", () => {
    const { change } = render({
      myTurn: false,
      choice: { quantity: 1, face: 6 },
      risk: "safe",
      safer: null,
    });
    wait(COACH_DELAY_MS * 2);
    expect(shown).toEqual([]);
    change({ myTurn: true });
    wait(COACH_DELAY_MS);
    change({ myTurn: false });
    expect(dismissed).toContain(shown[0]?.id);
  });
});
