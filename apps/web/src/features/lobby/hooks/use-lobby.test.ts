import { act, renderHook } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { useLobby } from "./use-lobby";

const playNow = vi.fn();
const latest = vi.fn();

vi.mock("@/hooks/use-chip-balance", () => ({
  useChipBalance: () => ({ status: "ready", amount: 0n }),
}));
vi.mock("./use-join-link", () => ({ useJoinLink: () => null }));
vi.mock("@/hooks/use-my-table-id", () => ({ useMyTableId: () => ({ status: "ready", id: null }) }));
vi.mock("./use-open-tables", () => ({
  useOpenTables: () => ({ status: "failed", retry: vi.fn() }),
  useLatestOpenTables: () => latest,
}));
vi.mock("./use-sit-down", () => ({ useSitDown: () => ({ playNow }) }));

afterEach(() => {
  vi.clearAllMocks();
});

describe("useLobby", () => {
  it("plays now from the open tables as they are at the moment of the press", () => {
    const { result } = renderHook(() => useLobby());
    act(() => result.current.playNow());
    expect(playNow).toHaveBeenCalledWith(latest, 0n);
  });
});
