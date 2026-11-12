import { afterEach, describe, expect, it, vi } from "vitest";
import { forgetCashOut, rememberCashOut, rememberedCashOuts } from "./pending-cash-outs";

const ALICE = "0x00000000000000000000000000000000000a11ce";
const BOB = "0x0000000000000000000000000000000000000b0b";
const FIRST = `0x${"1".repeat(64)}` as const;
const SECOND = `0x${"2".repeat(64)}` as const;

afterEach(() => {
  window.localStorage.clear();
  vi.restoreAllMocks();
});

describe("pending cash outs", () => {
  it("remembers each cash out once, per player", () => {
    rememberCashOut(ALICE, FIRST);
    rememberCashOut(ALICE, FIRST);
    rememberCashOut(ALICE, SECOND);
    expect(rememberedCashOuts(ALICE)).toEqual([FIRST, SECOND]);
    expect(rememberedCashOuts(BOB)).toEqual([]);
  });

  it("forgets a finished cash out and leaves the others", () => {
    rememberCashOut(ALICE, FIRST);
    rememberCashOut(ALICE, SECOND);
    forgetCashOut(ALICE, FIRST);
    expect(rememberedCashOuts(ALICE)).toEqual([SECOND]);
    forgetCashOut(ALICE, SECOND);
    expect(window.localStorage.length).toBe(0);
  });

  it("ignores saved values that are not cash outs", () => {
    window.localStorage.setItem(
      `bluff:cash-outs:${ALICE}`,
      JSON.stringify([FIRST, "0x12", 7, "not hex"])
    );
    expect(rememberedCashOuts(ALICE)).toEqual([FIRST]);
  });

  it("warns and carries on when the browser will not store anything", () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(rememberedCashOuts(ALICE)).toEqual([]);
    expect(warn).toHaveBeenCalledOnce();
  });
});
