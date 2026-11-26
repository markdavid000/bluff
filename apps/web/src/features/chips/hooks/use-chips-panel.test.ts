import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useChipsPanel } from "./use-chips-panel";

let pending: { data: string | null | undefined; isError: boolean } = {
  data: null,
  isError: false,
};

vi.mock("@/hooks/use-chip-balance", () => ({
  useChipBalance: () => ({ status: "ready", amount: 100n }),
}));
vi.mock("./use-claim-chips", () => ({ useClaimChips: () => ({ status: "waiting" }) }));
vi.mock("./use-pending-cash-out", () => ({
  usePendingCashOut: () => ({ ...pending, refetch: vi.fn() }),
}));
vi.mock("./use-cash-out", () => ({
  useCashOut: () => ({ resume: vi.fn(), cashOut: vi.fn(), working: false }),
}));

describe("useChipsPanel", () => {
  it("closes the cash out dialog once an unfinished cash out turns up, so Finish is in view", () => {
    const { result, rerender } = renderHook(() => useChipsPanel());
    act(() => result.current.setCashOutOpen(true));
    expect(result.current.cashOutOpen).toBe(true);
    pending = { data: "0xabc", isError: false };
    rerender();
    expect(result.current.cashOutOpen).toBe(false);
    expect(result.current.canCashOut).toBe(false);
    expect(result.current.resume).not.toBeNull();
  });
});
