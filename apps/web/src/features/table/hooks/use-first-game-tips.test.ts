import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { type Notice, onNotice } from "@/lib/notify";
import { DEFAULT_SETTINGS, type Settings } from "@/lib/settings-store";
import { tableCopy } from "../copy";
import { COACH_DELAY_MS, COACH_STAYS_MS } from "./use-coach-tips";
import { useFirstGameTips } from "./use-first-game-tips";

let settings: Settings = DEFAULT_SETTINGS;
const update = vi.fn((change: Partial<Settings>) => {
  settings = { ...settings, ...change };
});
vi.mock("@/hooks/use-settings", () => ({ useSettings: () => ({ settings, update }) }));

let shown: Notice[] = [];
let dismissed: string[] = [];
let stop: () => void = () => undefined;

beforeEach(() => {
  vi.useFakeTimers();
  settings = DEFAULT_SETTINGS;
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

interface Turn {
  myTurn: boolean;
  turnKey: string;
  hasBid: boolean;
}

function render(start: Turn) {
  let props = start;
  const hook = renderHook(() => useFirstGameTips(props));
  return {
    ...hook,
    change: (next: Partial<Turn>) => {
      props = { ...props, ...next };
      hook.rerender();
    },
  };
}

const wait = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe("useFirstGameTips", () => {
  it("explains wild ones on the player's first turn, and remembers it was shown", () => {
    const { result } = render({ myTurn: true, turnKey: "1-0", hasBid: false });
    expect(result.current.tipTurn).toBe(true);
    wait(COACH_DELAY_MS);
    expect(shown.map((notice) => notice.title)).toEqual([tableCopy.firstTips["wild-ones"]]);
    expect(shown[0]?.staysMs).toBe(COACH_STAYS_MS);
    expect(update).toHaveBeenCalledWith({ seenTips: ["wild-ones"] });
  });

  it("gives the next tip on a later turn, in order, one per turn", () => {
    const hook = render({ myTurn: true, turnKey: "1-0", hasBid: false });
    wait(COACH_DELAY_MS);
    hook.change({ myTurn: false, turnKey: "1-1" });
    hook.change({ myTurn: true, turnKey: "1-2", hasBid: true });
    wait(COACH_DELAY_MS);
    hook.change({ myTurn: false, turnKey: "1-3" });
    hook.change({ myTurn: true, turnKey: "1-4" });
    wait(COACH_DELAY_MS);
    hook.change({ myTurn: false, turnKey: "1-5" });
    hook.change({ myTurn: true, turnKey: "1-6" });
    wait(COACH_DELAY_MS);
    expect(shown.map((notice) => notice.title)).toEqual([
      tableCopy.firstTips["wild-ones"],
      tableCopy.firstTips["at-least"],
      tableCopy.firstTips["how-to-raise"],
      tableCopy.firstTips["call-bluff"],
    ]);
  });

  it("waits for a bid on the table before explaining raising and calling", () => {
    settings = { ...DEFAULT_SETTINGS, seenTips: ["wild-ones", "at-least"] };
    const { result } = render({ myTurn: true, turnKey: "2-0", hasBid: false });
    wait(COACH_DELAY_MS);
    expect(result.current.tipTurn).toBe(false);
    expect(shown).toEqual([]);
  });

  it("explains that a bid means at least that many once ones are explained, bid or no bid", () => {
    settings = { ...DEFAULT_SETTINGS, seenTips: ["wild-ones"] };
    render({ myTurn: true, turnKey: "2-0", hasBid: false });
    wait(COACH_DELAY_MS);
    expect(shown.map((notice) => notice.title)).toEqual([tableCopy.firstTips["at-least"]]);
  });

  it("never shows a tip again once all four were seen", () => {
    settings = {
      ...DEFAULT_SETTINGS,
      seenTips: ["wild-ones", "at-least", "how-to-raise", "call-bluff"],
    };
    const { result } = render({ myTurn: true, turnKey: "3-1", hasBid: true });
    wait(COACH_DELAY_MS);
    expect(result.current.tipTurn).toBe(false);
    expect(shown).toEqual([]);
  });

  it("keeps the turn for the tip after it is marked seen", () => {
    const hook = render({ myTurn: true, turnKey: "1-0", hasBid: false });
    wait(COACH_DELAY_MS);
    hook.rerender();
    expect(hook.result.current.tipTurn).toBe(true);
    expect(shown).toHaveLength(1);
  });

  it("closes the tip when the player says Got it", () => {
    render({ myTurn: true, turnKey: "1-0", hasBid: false });
    wait(COACH_DELAY_MS);
    expect(shown[0]?.action?.label).toBe(tableCopy.gotIt);
    shown[0]?.action?.onPress();
    expect(dismissed).toContain(shown[0]?.id);
  });

  it("shows nothing while it isn't the player's turn", () => {
    const { result } = render({ myTurn: false, turnKey: "1-1", hasBid: true });
    wait(COACH_DELAY_MS);
    expect(result.current.tipTurn).toBe(false);
    expect(shown).toEqual([]);
  });
});
